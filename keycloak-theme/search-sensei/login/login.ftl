<#import "template.ftl" as layout>
<@layout.registrationLayout>

    <div class="ss-card-header">
        <h2>Welcome back</h2>
        <p>Sign in to your account</p>
    </div>

    <#if message?has_content && message.summary?has_content>
        <div class="ss-alert ss-alert-${message.type!'error'}">
            ${kcSanitize(message.summary)?no_esc}
        </div>
    </#if>

    <form action="${url.loginAction}" method="post" class="ss-form">

        <div class="ss-form-group">
            <label for="username">Email</label>
            <input
                id="username"
                name="username"
                type="email"
                value="${(login.username)!''}"
                autocomplete="email"
                autofocus
                required
                placeholder="you@example.com"
            />
        </div>

        <div class="ss-form-group">
            <label for="password">Password</label>
            <input
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                required
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            />
        </div>

        <#if realm.rememberMe?? && realm.rememberMe>
            <div class="ss-form-group ss-remember">
                <label class="ss-checkbox-label">
                    <input type="checkbox" name="rememberMe" <#if login.rememberMe??>checked</#if> />
                    Keep me signed in
                </label>
            </div>
        </#if>

        <button type="submit" class="ss-btn-primary">
            Sign In
        </button>

    </form>

    <#if realm.resetPasswordAllowed?? && realm.resetPasswordAllowed>
        <div class="ss-form-footer">
            <a href="${url.loginResetCredentialsUrl}">Forgot your password?</a>
        </div>
    </#if>

</@layout.registrationLayout>
