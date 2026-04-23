<#import "template.ftl" as layout>
<@layout.registrationLayout ; section>

    <#if section = "header">
        <div class="ss-card-header">
            <h2>Reset your password</h2>
            <p>Enter your email and we'll send you a reset link</p>
        </div>
    <#elseif section = "form">

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
                    value="${(auth.attemptedUsername)!''}"
                    autocomplete="email"
                    autofocus
                    required
                    placeholder="you@example.com"
                />
            </div>

            <button type="submit" class="ss-btn-primary">
                Send Reset Link
            </button>

        </form>

        <div class="ss-form-footer">
            <a href="${url.loginUrl}">Back to Sign In</a>
        </div>

    </#if>

</@layout.registrationLayout>
