<#import "template.ftl" as layout>
<@layout.registrationLayout ; section>

    <#-- Detect expired action token errors from Keycloak -->
    <#assign isExpiredLink = message?has_content && message.summary?has_content &&
        (message.summary?lower_case?contains("expired") ||
         message.summary?lower_case?contains("action token") ||
         message.summary?lower_case?contains("invalid code") ||
         message.summary?lower_case?contains("no longer valid"))>

    <#if section = "header">
        <div class="ss-card-header">
            <#if isExpiredLink>
                <h2>This link has expired</h2>
                <p>The link you used is no longer valid</p>
            <#else>
                <h2>Something went wrong</h2>
                <p>An error occurred during the request</p>
            </#if>
        </div>
    <#elseif section = "form">

        <div class="ss-error-container">
            <div class="ss-error-icon">
                <#if isExpiredLink>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="22" stroke="#856404" stroke-width="2.5" fill="none"/>
                        <line x1="24" y1="14" x2="24" y2="26" stroke="#856404" stroke-width="2.5" stroke-linecap="round"/>
                        <circle cx="24" cy="32" r="1.5" fill="#856404"/>
                    </svg>
                <#else>
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                        <circle cx="24" cy="24" r="22" stroke="#dc3545" stroke-width="2.5" fill="none"/>
                        <line x1="16" y1="16" x2="32" y2="32" stroke="#dc3545" stroke-width="2.5" stroke-linecap="round"/>
                        <line x1="32" y1="16" x2="16" y2="32" stroke="#dc3545" stroke-width="2.5" stroke-linecap="round"/>
                    </svg>
                </#if>
            </div>

            <#if isExpiredLink>
                <div class="ss-alert ss-alert-warning">
                    <#-- Forgot password: they can request a new link themselves -->
                    <#-- Invite: they need to ask the admin — we cover both cases -->
                    To reset your password, return to sign in and request a new reset link.<br/>
                    If you were invited by an admin, please ask them to send a new invitation.
                </div>
            <#elseif message?has_content && message.summary?has_content>
                <div class="ss-alert ss-alert-error">
                    ${kcSanitize(message.summary)?no_esc}
                </div>
            </#if>

            <#if skipLink?? && !skipLink>
                <#if (client?? && client.baseUrl?has_content)>
                    <a href="${client.baseUrl}" class="ss-btn-primary ss-btn-block">
                        Back to Application
                    </a>
                </#if>
            </#if>

            <div class="ss-form-footer">
                <a href="${url.loginUrl}">Return to Sign In</a>
            </div>
        </div>

    </#if>

</@layout.registrationLayout>
