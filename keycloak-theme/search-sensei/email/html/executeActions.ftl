<#-- Invite / execute-actions email: used when admin triggers execute-actions-email API -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>You've been invited to Search Sensei</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">

    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

                    <!-- Header -->
                    <tr>
                        <td align="center" style="background:linear-gradient(180deg,#1d5d66 0%,#00c6b6 100%);border-radius:8px 8px 0 0;padding:32px 40px;">
                            <p style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Search Sensei</p>
                            <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);font-weight:300;">Customer Portal</p>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="background-color:#faf5ec;padding:36px 40px;border-left:1px solid rgba(0,0,0,0.08);border-right:1px solid rgba(0,0,0,0.08);">

                            <p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1d5d66;">
                                You've been invited
                            </p>
                            <p style="margin:0 0 24px;font-size:14px;color:#5a5c69;line-height:1.6;">
                                Hi ${user.firstName!''}<#if user.firstName?has_content>,</#if><br/>
                                An administrator has invited you to join Search Sensei.
                                Click the button below to set your password and activate your account.
                            </p>

                            <!-- CTA button -->
                            <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                                <tr>
                                    <td style="background-color:#1d5d66;border-radius:6px;">
                                        <a href="${link}" target="_blank"
                                           style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">
                                            Activate Account
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 8px;font-size:13px;color:#5a5c69;line-height:1.6;">
                                This link will expire in <strong>24 hours</strong>.
                                If you did not expect this invitation, you can safely ignore this email.
                            </p>

                            <hr style="border:none;border-top:1px solid rgba(0,0,0,0.08);margin:24px 0;" />

                            <p style="margin:0;font-size:12px;color:#9a9caa;line-height:1.6;">
                                If the button above doesn't work, copy and paste this URL into your browser:<br/>
                                <a href="${link}" style="color:#00c6b6;word-break:break-all;">${link}</a>
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color:#f0f2f4;border:1px solid rgba(0,0,0,0.08);border-top:none;border-radius:0 0 8px 8px;padding:18px 40px;text-align:center;">
                            <p style="margin:0;font-size:12px;color:#9a9caa;">
                                &copy; Search Sensei &mdash; Customer Portal
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
