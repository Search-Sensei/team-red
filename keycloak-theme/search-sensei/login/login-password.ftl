<#import "template.ftl" as layout>
<@layout.registrationLayout>

    <div class="ss-card-header">
        <h2>Enter your password</h2>
        <#if login.username?has_content>
            <p>${login.username?html}</p>
        </#if>
    </div>

    <#if message?has_content && message.summary?has_content>
        <div class="ss-alert ss-alert-${message.type!'error'}">
            ${kcSanitize(message.summary)?no_esc}
        </div>
    </#if>

    <form action="${url.loginAction}" method="post" class="ss-form">

        <div class="ss-form-group">
            <label for="password">Password</label>
            <input
                id="password"
                name="password"
                type="password"
                autocomplete="current-password"
                autofocus
                required
                placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
            />
        </div>

        <button type="submit" class="ss-btn-primary">
            Sign In
        </button>

    </form>

    <div class="ss-form-footer">
        <a href="${url.loginRestartFlowUrl}">Not you? Sign in with a different account</a>
    </div>

</@layout.registrationLayout>
