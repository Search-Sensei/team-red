<#import "template.ftl" as layout>
<@layout.registrationLayout ; section>

    <#if section = "header">
        <div class="ss-card-header">
            <h2>Something went wrong</h2>
            <p>An error occurred during the request</p>
        </div>
    <#elseif section = "form">

        <div class="ss-error-container">
            <div class="ss-error-icon">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="22" stroke="#dc3545" stroke-width="2.5" fill="none"/>
                    <line x1="16" y1="16" x2="32" y2="32" stroke="#dc3545" stroke-width="2.5" stroke-linecap="round"/>
                    <line x1="32" y1="16" x2="16" y2="32" stroke="#dc3545" stroke-width="2.5" stroke-linecap="round"/>
                </svg>
            </div>

            <#if message?has_content && message.summary?has_content>
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
