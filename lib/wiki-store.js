/**
 * Wiki store: DynamoDB when DYNAMODB_TABLE_PREFIX is set, otherwise in-memory.
 * Exposes getPage, putPage, createRevision, listRevisions, listComments, addComment.
 */
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const prefix = process.env.DYNAMODB_TABLE_PREFIX || '';
const region = process.env.AWS_REGION || 'us-east-1';
const useDynamo = Boolean(prefix);

let docClient;
if (useDynamo) {
  const client = new DynamoDBClient({ region });
  docClient = DynamoDBDocumentClient.from(client);
}

const tables = {
  pages: () => `${prefix}-WikiPages`,
  revisions: () => `${prefix}-WikiRevisions`,
  comments: () => `${prefix}-WikiComments`,
};

// In-memory fallback
const memory = {
  pages: new Map(),
  revisions: new Map(),
  comments: new Map(),
};

function revisionId() {
  return new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + '-' + require('crypto').randomBytes(4).toString('hex');
}

function commentId() {
  return new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + '-' + require('crypto').randomBytes(4).toString('hex');
}

async function getPage(pageId) {
  if (!pageId) return null;
  if (useDynamo) {
    const res = await docClient.send(new GetCommand({
      TableName: tables.pages(),
      Key: { pageId },
    }));
    return res.Item || null;
  }
  return memory.pages.get(pageId) || null;
}

async function putPage(item) {
  if (useDynamo) {
    await docClient.send(new PutCommand({
      TableName: tables.pages(),
      Item: item,
    }));
    return;
  }
  memory.pages.set(item.pageId, item);
}

async function updatePageContent(pageId, content, updatedAt, updatedBy, currentRevisionId) {
  if (useDynamo) {
    await docClient.send(new UpdateCommand({
      TableName: tables.pages(),
      Key: { pageId },
      UpdateExpression: 'SET content = :c, updatedAt = :u, updatedBy = :b, currentRevisionId = :r',
      ExpressionAttributeValues: {
        ':c': content,
        ':u': updatedAt,
        ':b': updatedBy || null,
        ':r': currentRevisionId || null,
      },
    }));
    return;
  }
  const p = memory.pages.get(pageId);
  if (p) {
    p.content = content;
    p.updatedAt = updatedAt;
    p.updatedBy = updatedBy;
    p.currentRevisionId = currentRevisionId;
  }
}

async function createRevision(pageId, content, userId, summary, status = 'pending') {
  const rev = {
    pageId,
    revisionId: revisionId(),
    content,
    timestamp: new Date().toISOString(),
    userId: userId || null,
    summary: summary || 'Edit',
    status: status || 'pending',
  };
  if (useDynamo) {
    await docClient.send(new PutCommand({
      TableName: tables.revisions(),
      Item: rev,
    }));
    return rev;
  }
  const list = memory.revisions.get(pageId) || [];
  list.unshift(rev);
  memory.revisions.set(pageId, list);
  return rev;
}

async function getRevision(pageId, revisionId) {
  if (!pageId || !revisionId) return null;
  if (useDynamo) {
    const res = await docClient.send(new GetCommand({
      TableName: tables.revisions(),
      Key: { pageId, revisionId },
    }));
    return res.Item || null;
  }
  const list = memory.revisions.get(pageId) || [];
  return list.find((r) => r.revisionId === revisionId) || null;
}

async function acceptRevision(pageId, revisionId, userId) {
  const rev = await getRevision(pageId, revisionId);
  if (!rev) return null;
  if (rev.status !== 'pending') return null;
  const now = new Date().toISOString();
  if (useDynamo) {
    await docClient.send(new UpdateCommand({
      TableName: tables.revisions(),
      Key: { pageId, revisionId },
      UpdateExpression: 'SET #s = :approved',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':approved': 'approved' },
    }));
    await updatePageContent(pageId, rev.content, now, userId, revisionId);
    return { ...rev, status: 'approved' };
  }
  rev.status = 'approved';
  const p = memory.pages.get(pageId);
  if (p) {
    p.content = rev.content;
    p.updatedAt = now;
    p.updatedBy = userId;
    p.currentRevisionId = revisionId;
  }
  return rev;
}

async function rejectRevision(pageId, revisionId) {
  const rev = await getRevision(pageId, revisionId);
  if (!rev) return null;
  if (rev.status !== 'pending') return null;
  if (useDynamo) {
    await docClient.send(new UpdateCommand({
      TableName: tables.revisions(),
      Key: { pageId, revisionId },
      UpdateExpression: 'SET #s = :rejected',
      ExpressionAttributeNames: { '#s': 'status' },
      ExpressionAttributeValues: { ':rejected': 'rejected' },
    }));
    return { ...rev, status: 'rejected' };
  }
  rev.status = 'rejected';
  return rev;
}

async function listRevisions(pageId, limit = 50) {
  if (useDynamo) {
    const res = await docClient.send(new QueryCommand({
      TableName: tables.revisions(),
      KeyConditionExpression: 'pageId = :pid',
      ExpressionAttributeValues: { ':pid': pageId },
      Limit: limit,
      ScanIndexForward: false,
    }));
    return res.Items || [];
  }
  const list = memory.revisions.get(pageId) || [];
  return list.slice(0, limit);
}

async function listComments(pageId, limit = 100) {
  if (useDynamo) {
    const res = await docClient.send(new QueryCommand({
      TableName: tables.comments(),
      KeyConditionExpression: 'pageId = :pid',
      ExpressionAttributeValues: { ':pid': pageId },
      Limit: limit,
    }));
    return res.Items || [];
  }
  const list = memory.comments.get(pageId) || [];
  return list.slice(0, limit);
}

async function addComment(pageId, userId, content, parentCommentId) {
  const comment = {
    pageId,
    commentId: commentId(),
    userId: userId || null,
    timestamp: new Date().toISOString(),
    content: content || '',
    parentCommentId: parentCommentId || null,
  };
  if (useDynamo) {
    await docClient.send(new PutCommand({
      TableName: tables.comments(),
      Item: comment,
    }));
    return comment;
  }
  const list = memory.comments.get(pageId) || [];
  list.push(comment);
  memory.comments.set(pageId, list);
  return comment;
}

module.exports = {
  useDynamo,
  getPage,
  putPage,
  updatePageContent,
  createRevision,
  getRevision,
  acceptRevision,
  rejectRevision,
  listRevisions,
  listComments,
  addComment,
};
