"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const email_service_1 = require("../src/services/email.service");
async function run() {
    await email_service_1.EmailService.sendOtp("SEU_EMAIL_AQUI@gmail.com", "123456");
    console.log("Email enviado com sucesso");
}
run();
