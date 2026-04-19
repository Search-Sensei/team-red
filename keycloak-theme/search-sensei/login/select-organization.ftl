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
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <rect x="3" y="3" width="7" height="18" rx="1"/>
                                <rect x="14" y="8" width="7" height="13" rx="1"/>
                                <line x1="5.5" y1="7" x2="7.5" y2="7"/>
                                <line x1="5.5" y1="10" x2="7.5" y2="10"/>
                                <line x1="5.5" y1="13" x2="7.5" y2="13"/>
                                <line x1="16.5" y1="12" x2="18.5" y2="12"/>
                                <line x1="16.5" y1="15" x2="18.5" y2="15"/>
                            </svg>
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
