<#import "template.ftl" as layout>
<@layout.registrationLayout ; section>

    <#if section = "header">
        <div class="ss-card-header">
            <h2>Welcome back</h2>
            <p>Enter your email to continue</p>
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

    </#if>

</@layout.registrationLayout>
