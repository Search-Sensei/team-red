<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=false; section>
    <#if section = "form">
        <h2 class="ss-title">Something went wrong</h2>
        <#if message?has_content && message.summary?has_content>
            <p class="ss-subtitle">${kcSanitize(message.summary)?no_esc}</p>
        </#if>
        <#if client?? && client.baseUrl?has_content>
            <p style="margin-top:1.5rem"><a href="${client.baseUrl}" class="ss-link">${msg("backToApplication")}</a></p>
        </#if>
    </#if>
</@layout.registrationLayout>
