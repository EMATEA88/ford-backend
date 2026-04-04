import { Request, Response } from "express";
import { createBetSlip } from "../services/betSlipService";
import { sendBetToTelegram } from "../services/telegramService";

export const testRealBet = async (req: Request, res: Response) => {
  try {
    console.log("🚀 [TEST] Gerando ficha...");

    const betSlip = await createBetSlip();

    if (!betSlip || !betSlip.games?.length) {
      console.warn("⚠️ Nenhuma previsão gerada");

      return res.status(400).json({
        success: false,
        message: "Nenhuma previsão disponível",
      });
    }

    console.log("📦 Ficha criada:", betSlip.id);

    const telegramSent = await sendBetToTelegram(betSlip);

    if (!telegramSent) {
      console.error("❌ Falha ao enviar Telegram");

      return res.status(500).json({
        success: false,
        message: "Ficha criada, mas falha no envio Telegram",
        betSlip,
      });
    }

    console.log("📲 Enviado para Telegram com sucesso");

    return res.status(200).json({
      success: true,
      message: "Ficha gerada e enviada com sucesso",
      betSlip,
    });
  } catch (err: any) {
    console.error("❌ Erro geral:", err.message);

    return res.status(500).json({
      success: false,
      message: "Erro interno ao gerar ficha",
    });
  }
};