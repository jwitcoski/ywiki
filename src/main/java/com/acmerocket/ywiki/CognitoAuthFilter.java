package com.acmerocket.ywiki;

import javax.ws.rs.container.ContainerRequestContext;
import javax.ws.rs.container.ContainerRequestFilter;
import javax.ws.rs.core.Response;
import javax.ws.rs.ext.Provider;
import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Validates Cognito JWT for protected paths and sets the current principal on the request.
 * When Cognito is not configured, all requests are allowed and no principal is set.
 * Public paths (GET /, /static, /version, GET /wiki) do not require auth.
 * Protected paths (e.g. POST /wiki) require a valid Bearer token; otherwise 401.
 */
@Provider
public class CognitoAuthFilter implements ContainerRequestFilter {

    public static final String REQUEST_PROPERTY_PRINCIPAL = "com.acmerocket.ywiki.cognitoPrincipal";

    private static final Set<String> PUBLIC_PREFIXES = new HashSet<>(Arrays.asList(
        "", "static", "version", "auth"
    ));

    private static final CognitoConfig CONFIG = CognitoConfig.load();
    private static final CognitoJwtValidator VALIDATOR = CONFIG.isConfigured() ? new CognitoJwtValidator(CONFIG) : null;

    @Override
    public void filter(ContainerRequestContext requestContext) throws IOException {
        String path = requestContext.getUriInfo().getPath();
        String method = requestContext.getMethod();
        boolean isPublic = isPublicPath(path, method);

        if (!CONFIG.isConfigured()) {
            if (!isPublic) {
                requestContext.setProperty(REQUEST_PROPERTY_PRINCIPAL, null);
            }
            return;
        }

        String authHeader = requestContext.getHeaderString("Authorization");
        CognitoPrincipal principal = VALIDATOR != null ? VALIDATOR.validate(authHeader) : null;

        if (principal != null) {
            requestContext.setProperty(REQUEST_PROPERTY_PRINCIPAL, principal);
        }

        if (!isPublic && principal == null) {
            requestContext.abortWith(
                Response.status(Response.Status.UNAUTHORIZED)
                    .entity("{\"error\":\"Unauthorized\",\"message\":\"Valid Cognito token required\"}")
                    .type("application/json")
                    .build()
            );
        }
    }

    private boolean isPublicPath(String path, String method) {
        if ("GET".equalsIgnoreCase(method) && (path == null || path.isEmpty())) {
            return true;
        }
        String firstSegment = path == null ? "" : path.split("/")[0];
        if (PUBLIC_PREFIXES.contains(firstSegment)) {
            return true;
        }
        if ("wiki".equals(firstSegment) && "GET".equalsIgnoreCase(method)) {
            return true;
        }
        return false;
    }
}
