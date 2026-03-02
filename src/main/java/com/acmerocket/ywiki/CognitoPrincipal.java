package com.acmerocket.ywiki;

import java.util.Objects;

/**
 * Identity of the current user from a validated Cognito JWT.
 */
public final class CognitoPrincipal {
    private final String sub;
    private final String email;
    private final String username;

    public CognitoPrincipal(String sub, String email, String username) {
        this.sub = sub;
        this.email = email;
        this.username = username;
    }

    public String getSub() { return sub; }
    public String getEmail() { return email; }
    public String getUsername() { return username; }

    @Override
    public String toString() {
        return "CognitoPrincipal{sub=" + sub + ", email=" + email + ", username=" + username + "}";
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        CognitoPrincipal that = (CognitoPrincipal) o;
        return Objects.equals(sub, that.sub);
    }

    @Override
    public int hashCode() {
        return Objects.hash(sub);
    }
}
