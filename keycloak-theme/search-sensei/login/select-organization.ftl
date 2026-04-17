<#import "template.ftl" as layout>
<@layout.registrationLayout ; section>

    <#if section = "header">
        <div class="ss-card-header">
            <h2>Select Organisation</h2>
            <p>Choose which organisation to continue with</p>
        </div>
    <#elseif section = "form">

        <form action="${url.loginAction}" method="post" id="kc-select-org-form">
            <input type="hidden" name="kc.org"/>
            <div class="ss-org-list">
                <#list user.organizations as organization>
                    <a href="#" class="ss-org-item"
                       onclick="document.forms['kc-select-org-form']['kc.org'].value='${organization.alias}';document.forms['kc-select-org-form'].requestSubmit();return false;">
                        <div class="ss-org-icon">
                            ${(organization.name!organization.alias)?substring(0, 1)?upper_case}
                        </div>
                        <div class="ss-org-info">
                            <span class="ss-org-name">${organization.name!}</span>
                        </div>
                        <svg class="ss-org-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </a>
                </#list>
            </div>
        </form>

    </#if>

</@layout.registrationLayout>
