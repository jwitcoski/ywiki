package com.acmerocket.ywiki;

import java.util.Map;

/**
 * Cognito configuration. Reads from project.properties with override from environment:
 * COGNITO_USER_POOL_ID, COGNITO_REGION, COGNITO_CLIENT_ID, COGNITO_DOMAIN.
 */
public final class CognitoConfig {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(CognitoConfig.class);

    private static final String ENV_PREFIX = "COGNITO_";
    private static final String KEY_USER_POOL_ID = "userPoolId";
    private static final String KEY_REGION = "region";
    private static final String KEY_CLIENT_ID = "clientId";
    private static final String KEY_DOMAIN = "domain";

    private final String userPoolId;
    private final String region;
    private final String clientId;
    private final String domain;
    private final String jwksUrl;

    private CognitoConfig(String userPoolId, String region, String clientId, String domain) {
        this.userPoolId = userPoolId;
        this.region = region != null ? region : "us-east-1";
        this.clientId = clientId;
        this.domain = domain;
        this.jwksUrl = (userPoolId != null && !userPoolId.isEmpty())
            ? "https://cognito-idp." + this.region + ".amazonaws.com/" + userPoolId + "/.well-known/jwks.json"
            : null;
    }

    public static CognitoConfig load() {
        Map<String, String> props = ProjectProperties.instance();
        String userPoolId = envOrProp("USER_POOL_ID", props.get("cognito.userPoolId"));
        String region = envOrProp("REGION", props.get("cognito.region"));
        String clientId = envOrProp("CLIENT_ID", props.get("cognito.clientId"));
        String domain = envOrProp("DOMAIN", props.get("cognito.domain"));
        CognitoConfig c = new CognitoConfig(userPoolId, region, clientId, domain);
        if (c.isConfigured()) {
            LOG.info("Cognito configured: region={}, userPoolId={}, clientId={}", c.region, c.userPoolId, c.clientId != null ? "***" : null);
        } else {
            LOG.info("Cognito not configured; auth will be disabled.");
        }
        return c;
    }

    private static String envOrProp(String envSuffix, String propValue) {
        String envKey = ENV_PREFIX + envSuffix;
        String env = System.getenv(envKey);
        if (env != null && !env.trim().isEmpty()) {
            return env.trim();
        }
        return propValue != null ? propValue.trim() : null;
    }

    public boolean isConfigured() {
        return userPoolId != null && !userPoolId.isEmpty()
            && clientId != null && !clientId.isEmpty();
    }

    public String getUserPoolId() { return userPoolId; }
    public String getRegion() { return region; }
    public String getClientId() { return clientId; }
    public String getDomain() { return domain; }
    public String getJwksUrl() { return jwksUrl; }

    /** Full Cognito Hosted UI URL (with https if domain is a prefix only). */
    public String getDomainUrl() {
        if (domain == null || domain.isEmpty()) return "";
        if (domain.contains("://")) return domain;
        return "https://" + domain + ".auth." + region + ".amazonaws.com";
    }
}
