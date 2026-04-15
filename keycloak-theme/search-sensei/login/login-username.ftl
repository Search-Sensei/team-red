<!DOCTYPE html>
<html lang="${(locale.currentLanguageTag)!'en'}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Search Sensei &mdash; Sign In</title>
    <link rel="stylesheet" href="${url.resourcesPath}/css/search-sensei.css">
</head>
<body>

<div class="ss-page">

    <div class="ss-panel-left">
        <div class="ss-brand">
            <img src="${url.resourcesPath}/img/logo.png" alt="Search Sensei" class="ss-logo" />
            <h1 class="ss-brand-name">Search Sensei</h1>
            <p class="ss-brand-tagline">Customer Portal</p>
        </div>
    </div>

    <div class="ss-panel-right">
        <div class="ss-card">

            <div class="ss-card-header">
                <h2>Welcome back</h2>
                <p>Enter your email to continue</p>
            </div>

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

                <button type="submit" class="ss-btn-primary">
                    Continue
                </button>

            </form>

        </div>
    </div>

</div>

</body>
</html>
