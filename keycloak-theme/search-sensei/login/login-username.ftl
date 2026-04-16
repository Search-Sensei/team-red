<#import "template.ftl" as layout>
<@layout.registrationLayout>

    <div class="ss-card-header">
        <h2>Welcome back</h2>
        <p>Enter your email to continue</p>
    </div>

    <#if message?has_content && message.summary?has_content>
        <div class="ss-alert ss-alert-${message.type!'error'}">
            ${message.summary}
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

        <button type="submit" class="ss-btn-primary">
            Continue
        </button>

    </form>

</@layout.registrationLayout>
