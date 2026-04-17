<#macro registrationLayout displayMessage=true displayInfo=false displayRequiredFields=false bodyClass="" socialProvidersPresent=false>
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
            <#nested "form">
        </div>
    </div>

</div>

</body>
</html>
</#macro>
