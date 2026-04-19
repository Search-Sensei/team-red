<#import "template.ftl" as layout>
<@layout.registrationLayout ; section>

    <#if section = "header">
        <div class="ss-card-header">
            <h2>Welcome back</h2>
            <#if usernameHidden??>
                <#if login.username?has_content>
                    <p>${login.username}</p>
                <#else>
                    <p>Sign in to your account</p>
                </#if>
                <a href="${url.loginRestartFlowUrl}" class="ss-back-link">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Change email
                </a>
            <#else>
                <p>Sign in to your account</p>
            </#if>
        </div>
    <#elseif section = "form">

        <#if message?has_content && message.summary?has_content>
            <div class="ss-alert ss-alert-${message.type!'error'}">
                ${kcSanitize(message.summary)?no_esc}
            </div>
        </#if>

        <form action="${url.loginAction}" method="post" class="ss-form">

            <#if !usernameHidden??>
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
            </#if>

            <div class="ss-form-group">
                <label for="password">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    <#if usernameHidden??>autofocus</#if>
                    required
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                />
            </div>

            <#if realm.rememberMe?? && realm.rememberMe && !usernameHidden??>
                <div class="ss-form-group ss-remember">
                    <label class="ss-checkbox-label">
                        <input type="checkbox" name="rememberMe" <#if login.rememberMe??>checked</#if> />
                        Keep me signed in
                    </label>
                </div>
            </#if>

            <input type="hidden" id="id-hidden-input" name="credentialId" <#if auth?has_content && auth.selectedCredential?has_content>value="${auth.selectedCredential}"</#if>/>
            <button type="submit" class="ss-btn-primary">
                Sign In
            </button>

        </form>

        <#if realm.resetPasswordAllowed?? && realm.resetPasswordAllowed>
            <div class="ss-form-footer">
                <a href="${url.loginResetCredentialsUrl}">Forgot your password?</a>
            </div>
        </#if>

    </#if>

</@layout.registrationLayout>
