# Database structure (DynamoDB)

Single source of truth for wiki DynamoDB tables. S3 is used only for binary assets (maps, photos).

## Tables

### WikiPages

Stores the current state of each wiki page (resort). Populated initially from parquet; updated by wiki edits.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| pageId | String | PK | Unique page id (slug from name or winter_sports_id) |
| title | String | | Page title (parquet: name) |
| content | String | | Markdown body |
| winterSportsId | String | | Parquet: winter_sports_id |
| winterSportsType | String | | Parquet: winter_sports_type |
| country | String | GSI PK | Parquet: country |
| state | String | GSI SK | Parquet: state |
| region | String | | Parquet: region |
| categorization | Map | | { continent, country, state, province, size } |
| centroidLat | Number | | Parquet: centroid_lat |
| centroidLon | Number | | Parquet: centroid_lon |
| totalAreaHa | Number | | Parquet: total_area_ha |
| totalAreaAcres | Number | | Parquet: total_area_acres |
| skiableTerrainHa | Number | | Parquet: skiable_terrain_ha |
| skiableTerrainAcres | Number | | Parquet: skiable_terrain_acres |
| totalLifts | String | | Parquet: total_lifts |
| longestLiftMi | Number | | Parquet: longest_lift_mi |
| downhillTrails | String | | Parquet: downhill_trails |
| longestTrailMi | Number | | Parquet: longest_trail_mi |
| avgTrailMi | Number | | Parquet: avg_trail_mi |
| trailsNovice | String | | Parquet: trails_novice |
| trailsEasy | String | | Parquet: trails_easy |
| trailsIntermediate | String | | Parquet: trails_intermediate |
| trailsAdvanced | String | | Parquet: trails_advanced |
| trailsExpert | String | | Parquet: trails_expert |
| trailsFreeride | String | | Parquet: trails_freeride |
| trailsExtreme | String | | Parquet: trails_extreme |
| gladedTerrain | String | | Parquet: gladed_terrain |
| snowPark | String | | Parquet: snow_park |
| sleddingTubing | String | | Parquet: sledding_tubing |
| liftTypes | String | | Parquet: lift_types |
| resortType | String | | Parquet: resort_type |
| createdAt | String | | ISO timestamp |
| updatedAt | String | | ISO timestamp |
| createdBy | String | | User id (Cognito sub) |
| updatedBy | String | | User id |
| status | String | | published, draft, pending_review |
| currentRevisionId | String | | Latest approved revision id |

**GSI**: `CountryStateIndex` — Partition key: `country`, Sort key: `state` — for listing/filtering by location.

---

### WikiRevisions

History of page content changes. One item per revision.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| pageId | String | PK | Page this revision belongs to |
| revisionId | String | SK | Unique revision id (e.g. timestamp-uuid) |
| content | String | | Full Markdown at this revision |
| timestamp | String | | ISO timestamp |
| userId | String | | Cognito sub |
| summary | String | | Short change description |
| diff | String | | Optional diff text |
| status | String | | **approved** (accepted), **pending** (proposed), **rejected** — page content updates only when a revision is approved |
| parentRevisionId | String | | For revert chain |

---

### WikiComments

Comments on a page. Optional threading via parentCommentId.

| Attribute | Type | Key | Description |
|-----------|------|-----|-------------|
| pageId | String | PK | Page this comment is on |
| commentId | String | SK | Unique comment id (e.g. timestamp-uuid) |
| userId | String | | Cognito sub |
| timestamp | String | | ISO timestamp |
| content | String | | Comment text |
| parentCommentId | String | | Optional; for replies |

---

## Parquet → WikiPages mapping

Source: `ski_areas_analyzed.parquet` (e.g. from S3).

| Parquet column | WikiPages attribute |
|----------------|---------------------|
| winter_sports_id | winterSportsId |
| winter_sports_type | winterSportsType |
| name | title |
| country | country |
| state | state |
| region | region |
| centroid_lat | centroidLat |
| centroid_lon | centroidLon |
| total_area_ha | totalAreaHa |
| total_area_acres | totalAreaAcres |
| skiable_terrain_ha | skiableTerrainHa |
| skiable_terrain_acres | skiableTerrainAcres |
| total_lifts | totalLifts |
| longest_lift_mi | longestLiftMi |
| downhill_trails | downhillTrails |
| longest_trail_mi | longestTrailMi |
| avg_trail_mi | avgTrailMi |
| trails_novice | trailsNovice |
| trails_easy | trailsEasy |
| trails_intermediate | trailsIntermediate |
| trails_advanced | trailsAdvanced |
| trails_expert | trailsExpert |
| trails_freeride | trailsFreeride |
| trails_extreme | trailsExtreme |
| gladed_terrain | gladedTerrain |
| snow_park | snowPark |
| sledding_tubing | sleddingTubing |
| lift_types | liftTypes |
| resort_type | resortType |

`pageId`: slug from `name` (lowercase, replace spaces/special with `-`).  
`content`: initial Markdown generated from the above fields.  
`categorization`: set from country, state, region; `size` from skiable_terrain (e.g. small &lt; 100 ha, medium &lt; 500, large ≥ 500).
