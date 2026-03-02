package com.acmerocket.ywiki;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.proc.JWSKeySelector;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;

import java.net.URL;
import java.util.List;

/**
 * Validates Cognito ID tokens (JWT) using the User Pool's JWKS endpoint.
 * Caches the JWK set for a short time to avoid repeated fetches.
 */
public final class CognitoJwtValidator {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(CognitoJwtValidator.class);

    private final CognitoConfig config;
    private final DefaultJWTProcessor<SecurityContext> processor;
    private final String expectedIssuer;

    public CognitoJwtValidator(CognitoConfig config) {
        this.config = config;
        this.expectedIssuer = "https://cognito-idp." + config.getRegion() + ".amazonaws.com/" + config.getUserPoolId();
        this.processor = buildProcessor();
    }

    private DefaultJWTProcessor<SecurityContext> buildProcessor() {
        try {
            URL jwksUrl = new URL(config.getJwksUrl());
            JWKSource<SecurityContext> keySource = new RemoteJWKSet<>(jwksUrl);
            JWSKeySelector<SecurityContext> keySelector = new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, keySource);
            DefaultJWTProcessor<SecurityContext> proc = new DefaultJWTProcessor<>();
            proc.setJWSKeySelector(keySelector);
            return proc;
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid Cognito JWKS URL: " + config.getJwksUrl(), e);
        }
    }

    /**
     * Validates the ID token and returns a principal, or null if invalid/missing.
     */
    public CognitoPrincipal validate(String bearerToken) {
        if (bearerToken == null || bearerToken.isEmpty()) {
            return null;
        }
        String token = bearerToken.startsWith("Bearer ") ? bearerToken.substring(7).trim() : bearerToken;
        if (token.isEmpty()) {
            return null;
        }
        try {
            JWTClaimsSet claims = processor.process(token, null);
            String iss = claims.getIssuer();
            if (iss == null || !iss.equals(expectedIssuer)) {
                LOG.warn("Invalid iss: expected {}, got {}", expectedIssuer, iss);
                return null;
            }
            Object tokenUse = claims.getClaim("token_use");
            if (tokenUse != null && !"id".equals(tokenUse.toString())) {
                LOG.warn("Invalid token_use: expected id, got {}", tokenUse);
                return null;
            }
            Object aud = claims.getAudience();
            String clientId = config.getClientId();
            boolean audOk = false;
            if (aud instanceof String) {
                audOk = clientId.equals(aud);
            } else if (aud instanceof List) {
                audOk = ((List<?>) aud).contains(clientId);
            }
            if (!audOk) {
                LOG.warn("Invalid aud: expected {}, got {}", clientId, aud);
                return null;
            }
            String sub = claims.getSubject();
            if (sub == null || sub.isEmpty()) {
                return null;
            }
            if (claims.getExpirationTime() != null && claims.getExpirationTime().before(new java.util.Date())) {
                LOG.debug("Token expired");
                return null;
            }
            String email = claims.getClaim("email") != null ? claims.getClaim("email").toString() : null;
            String username = claims.getClaim("cognito:username") != null ? claims.getClaim("cognito:username").toString() : null;
            if (username == null) {
                username = (String) claims.getClaim("preferred_username");
            }
            return new CognitoPrincipal(sub, email, username);
        } catch (Exception e) {
            LOG.debug("Token validation failed: {}", e.getMessage());
            return null;
        }
    }
}
