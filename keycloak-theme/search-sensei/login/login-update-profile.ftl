<#import "template.ftl" as layout>
<@layout.registrationLayout ; section>

    <#if section = "header">
        <div class="ss-card-header">
            <h2>Update Your Profile</h2>
            <p>Please review and complete your information</p>
        </div>
    <#elseif section = "form">

        <#if message?has_content && message.summary?has_content>
            <div class="ss-alert ss-alert-${message.type!'error'}">
                ${kcSanitize(message.summary)?no_esc}
            </div>
        </#if>

        <form action="${url.loginAction}" method="post" class="ss-form">

            <#if user.editUsernameAllowed?? && user.editUsernameAllowed>
                <div class="ss-form-group">
                    <label for="username">Username</label>
                    <input
                        id="username"
                        name="username"
                        type="text"
                        value="${(user.username)!''}"
                        autocomplete="username"
                    />
                </div>
            </#if>

            <div class="ss-form-group">
                <label for="email">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    value="${(user.email)!''}"
                    autocomplete="email"
                />
            </div>

            <div class="ss-form-group">
                <label for="firstName">First Name</label>
                <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value="${(user.firstName)!''}"
                    autocomplete="given-name"
                />
            </div>

            <div class="ss-form-group">
                <label for="lastName">Last Name</label>
                <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value="${(user.lastName)!''}"
                    autocomplete="family-name"
                />
            </div>

            <button type="submit" class="ss-btn-primary">
                Save
            </button>

        </form>

    </#if>

</@layout.registrationLayout>
