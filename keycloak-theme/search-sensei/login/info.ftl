<#import "template.ftl" as layout>
<@layout.registrationLayout ; section>

    <#if section = "header">
        <div class="ss-card-header">
            <#if requiredActions?has_content>
                <h2>Almost there</h2>
                <p>Click below to continue setting up your account</p>
            <#else>
                <h2>Information</h2>
                <p>&nbsp;</p>
            </#if>
        </div>
    <#elseif section = "form">

        <#if message?has_content && message.summary?has_content>
            <div class="ss-alert ss-alert-info">
                ${kcSanitize(message.summary)?no_esc}
            </div>
        </#if>

        <#-- Execute-actions flow: auto-proceed so the user goes straight to the
             password form without having to click an intermediate step. -->
        <#if actionUri?has_content>
            <script>window.location.replace("${actionUri?no_esc}");</script>
            <noscript>
                <a href="${actionUri?no_esc}" class="ss-btn-primary" style="display:block;text-align:center;text-decoration:none;margin-top:0.5rem;">
                    Continue
                </a>
            </noscript>
        <#elseif pageRedirectUri?has_content>
            <div class="ss-form-footer">
                <a href="${pageRedirectUri?no_esc}">Back to Application</a>
            </div>
        <#elseif skipLink?? && !skipLink>
            <#if (client?? && client.baseUrl?has_content)>
                <a href="${client.baseUrl}" class="ss-btn-primary ss-btn-block" style="text-align:center;text-decoration:none;">
                    Back to Application
                </a>
            </#if>
        </#if>

    </#if>

</@layout.registrationLayout>
