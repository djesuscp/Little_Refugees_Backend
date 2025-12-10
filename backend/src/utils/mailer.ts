import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await resend.emails.send({
      from: process.env.MAIL_FROM || "onboarding@resend.dev",
      to,
      subject,
      html,
    });

    console.log("Email enviado correctamente a", to);
    return true;
  } catch (error: any) {
    console.error( "Error al enviar email." , error);
    return false;
  }
};
