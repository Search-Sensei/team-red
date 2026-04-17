<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "form">

        <div id="register-success" style="display:none">
            <div class="ss-card-header">
                <h2>You're all set!</h2>
                <p>Your account has been created successfully.</p>
            </div>
            <div class="ss-alert ss-alert-success">
                You can now close this tab and sign in through the Search Sensei portal.
            </div>
        </div>

        <div id="register-form">
            <div class="ss-card-header">
                <h2>Create your account</h2>
                <p>Complete your registration to get started</p>
            </div>

            <#if message?has_content && message.summary?has_content>
                <div class="ss-alert ss-alert-${message.type!'error'}">
                    ${kcSanitize(message.summary)?no_esc}
                </div>
            </#if>

            <form id="kc-register-form" action="${url.registrationAction}" method="post" class="ss-form">

                <div class="ss-form-group">
                    <label for="firstName">First name</label>
                    <input
                        id="firstName"
                        name="firstName"
                        type="text"
                        value="${(register.formData.firstName)!''}"
                        autocomplete="given-name"
                        autofocus
                        required
                        placeholder="Jane"
                    />
                    <#if messagesPerField.existsError('firstName')>
                        <span class="ss-field-error">${kcSanitize(messagesPerField.get('firstName'))?no_esc}</span>
                    </#if>
                </div>

                <div class="ss-form-group">
                    <label for="lastName">Last name</label>
                    <input
                        id="lastName"
                        name="lastName"
                        type="text"
                        value="${(register.formData.lastName)!''}"
                        autocomplete="family-name"
                        required
                        placeholder="Doe"
                    />
                    <#if messagesPerField.existsError('lastName')>
                        <span class="ss-field-error">${kcSanitize(messagesPerField.get('lastName'))?no_esc}</span>
                    </#if>
                </div>

                <div class="ss-form-group">
                    <label for="email">Email</label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value="${(register.formData.email)!''}"
                        autocomplete="email"
                        required
                        placeholder="you@example.com"
                    />
                    <#if messagesPerField.existsError('email')>
                        <span class="ss-field-error">${kcSanitize(messagesPerField.get('email'))?no_esc}</span>
                    </#if>
                </div>

                <#if !realm.registrationEmailAsUsername>
                    <div class="ss-form-group">
                        <label for="username">Username</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            value="${(register.formData.username)!''}"
                            autocomplete="username"
                            required
                        />
                        <#if messagesPerField.existsError('username')>
                            <span class="ss-field-error">${kcSanitize(messagesPerField.get('username'))?no_esc}</span>
                        </#if>
                    </div>
                </#if>

                <#if passwordRequired??>
                    <div class="ss-form-group">
                        <label for="password">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autocomplete="new-password"
                            required
                            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                        />
                        <#if messagesPerField.existsError('password')>
                            <span class="ss-field-error">${kcSanitize(messagesPerField.get('password'))?no_esc}</span>
                        </#if>
                    </div>

                    <div class="ss-form-group">
                        <label for="password-confirm">Confirm password</label>
                        <input
                            id="password-confirm"
                            name="password-confirm"
                            type="password"
                            autocomplete="new-password"
                            required
                            placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                        />
                        <#if messagesPerField.existsError('password-confirm')>
                            <span class="ss-field-error">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</span>
                        </#if>
                    </div>
                </#if>

                <button type="submit" id="kc-register-submit" class="ss-btn-primary">
                    Create Account
                </button>

            </form>

            <div class="ss-form-footer">
                <a href="${url.loginUrl}">Already have an account? Sign in</a>
            </div>
        </div>

        <script>
            var form = document.getElementById('kc-register-form');
            var submitBtn = document.getElementById('kc-register-submit');

            form.addEventListener('submit', function(e) {
                e.preventDefault();

                submitBtn.disabled = true;
                submitBtn.textContent = 'Creating account\u2026';

                var formData = new URLSearchParams(new FormData(form));

                fetch(form.action, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData.toString(),
                    redirect: 'manual'
                })
                .then(function(response) {
                    if (response.type === 'opaqueredirect') {
                        // Keycloak issued a redirect = registration succeeded
                        document.getElementById('register-form').style.display = 'none';
                        document.getElementById('register-success').style.display = 'block';
                    } else {
                        // Keycloak returned a 200 = validation errors, submit normally
                        form.submit();
                    }
                })
                .catch(function() {
                    form.submit();
                });
            });
        </script>

    </#if>
</@layout.registrationLayout>
