<#import "template.ftl" as layout>
<@layout.registrationLayout ; section>

    <#if section = "header">
        <div class="ss-card-header">
            <#if isAppInitiatedAction??>
                <h2>Create your password</h2>
                <p>Welcome to Search Sensei — set a password to activate your account</p>
            <#else>
                <h2>Set a new password</h2>
                <p>Choose a strong password for your account</p>
            </#if>
        </div>
    <#elseif section = "form">

        <#if message?has_content && message.summary?has_content>
            <div class="ss-alert ss-alert-${message.type!'error'}">
                ${kcSanitize(message.summary)?no_esc}
            </div>
        </#if>

        <#-- Show user info as read-only context for invited users -->
        <#if isAppInitiatedAction?? && (user.firstName?has_content || user.lastName?has_content || user.username?has_content)>
            <div class="ss-user-info">
                <#if user.firstName?has_content || user.lastName?has_content>
                    <div class="ss-form-group">
                        <label>Name</label>
                        <input
                            type="text"
                            value="${(user.firstName!'')}<#if user.firstName?has_content && user.lastName?has_content> </#if>${(user.lastName!'')}"
                            readonly
                            class="ss-input-readonly"
                        />
                    </div>
                </#if>
                <#if user.username?has_content>
                    <div class="ss-form-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value="${user.username}"
                            readonly
                            class="ss-input-readonly"
                        />
                    </div>
                </#if>
            </div>
        </#if>

        <form action="${url.loginAction}" method="post" class="ss-form">

            <div class="ss-form-group">
                <label for="password-new">New password</label>
                <input
                    id="password-new"
                    name="password-new"
                    type="password"
                    autocomplete="new-password"
                    autofocus
                    required
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                />
                <#if messagesPerField.existsError('password')>
                    <span class="ss-field-error">${kcSanitize(messagesPerField.get('password'))?no_esc}</span>
                </#if>
            </div>

            <div class="ss-form-group">
                <label for="password-confirm">Confirm new password</label>
                <input
                    id="password-confirm"
                    name="password-confirm"
                    type="password"
                    autocomplete="new-password"
                    required
                    placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                />
                <#if messagesPerField.existsError('password-confirm')>
                    <span class="ss-field-error">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</span>
                </#if>
            </div>

            <button type="submit" class="ss-btn-primary">
                <#if isAppInitiatedAction??>
                    Activate Account
                <#else>
                    Update Password
                </#if>
            </button>

        </form>

        <#if !isAppInitiatedAction??>
            <div class="ss-form-footer">
                <a href="${url.loginUrl}">Back to Sign In</a>
            </div>
        </#if>

    </#if>

</@layout.registrationLayout>
