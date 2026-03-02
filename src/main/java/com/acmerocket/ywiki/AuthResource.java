package com.acmerocket.ywiki;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

/**
 * Auth configuration for the frontend (Cognito Hosted UI URL, client id).
 * No secrets; used to build login/logout URLs.
 */
@Path("auth")
public class AuthResource {

    private static final CognitoConfig CONFIG = CognitoConfig.load();

    @GET
    @Path("config")
    @Produces(MediaType.APPLICATION_JSON)
    public Response getConfig() {
        Map<String, String> map = new HashMap<>();
        map.put("configured", String.valueOf(CONFIG.isConfigured()));
        map.put("region", CONFIG.getRegion());
        map.put("userPoolId", CONFIG.getUserPoolId() != null ? CONFIG.getUserPoolId() : "");
        map.put("clientId", CONFIG.getClientId() != null ? CONFIG.getClientId() : "");
        map.put("domain", CONFIG.getDomain() != null ? CONFIG.getDomainUrl() : "");
        return Response.ok(map).build();
    }
}
