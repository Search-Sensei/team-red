<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Search Sensei &mdash; Sign In</title>
    <link rel="stylesheet" href="${url.resourcesPath}/css/search-sensei.css">
</head>
<body>

<div class="ss-page">

    <!-- Left panel: brand -->
    <div class="ss-panel-left">
        <div class="ss-brand">
            <img src="${url.resourcesPath}/img/logo.png" alt="Search Sensei" class="ss-logo" />
            <h1 class="ss-brand-name">Search Sensei</h1>
            <p class="ss-brand-tagline">Customer Portal</p>
        </div>
    </div>

    <!-- Right panel: form -->
    <div class="ss-panel-right">
        <div class="ss-card">

            <div class="ss-card-header">
                <h2>Welcome back</h2>
                <p>Sign in to your account</p>
            </div>

            <#-- Alert messages (errors, info, warnings) -->
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

                <div class="ss-form-group">
                    <label for="password">Password</label>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autocomplete="current-password"
                        required
                        placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                    />
                </div>

                <#-- Remember me (only shown if realm has it enabled) -->
                <#if realm.rememberMe?? && realm.rememberMe>
                    <div class="ss-form-group ss-remember">
                        <label class="ss-checkbox-label">
                            <input type="checkbox" name="rememberMe" <#if login.rememberMe??>checked</#if> />
                            Keep me signed in
                        </label>
                    </div>
                </#if>

                <button type="submit" class="ss-btn-primary">
                    Sign In
                </button>

            </form>

            <#-- Forgot password link (only shown if realm has it enabled) -->
            <#if realm.resetPasswordAllowed?? && realm.resetPasswordAllowed>
                <div class="ss-form-footer">
                    <a href="${url.loginResetCredentialsUrl}">Forgot your password?</a>
                </div>
            </#if>

        </div>
    </div>

</div>

</body>
</html>
