import { WebpayPlus } from 'transbank-sdk';
import { Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } from 'transbank-sdk';

// Configuración
const commerceCode = process.env.WEBPAY_COMMERCE_CODE || IntegrationCommerceCodes.WEBPAY_PLUS;
const apiKey = process.env.WEBPAY_API_KEY || IntegrationApiKeys.WEBPAY;
const host = process.env.WEBPAY_HOST || '';

// Detectar entorno: Si el host contiene 'webpay3gint' o el código es el de integración
const isIntegration = host.includes('webpay3gint') || 
                      commerceCode === IntegrationCommerceCodes.WEBPAY_PLUS;

const environment = isIntegration ? Environment.Integration : Environment.Production;

console.log(`[Webpay] Initialized with CommerceCode: ${commerceCode}, Env: ${isIntegration ? 'Integration' : 'Production'}`);

const tx = new WebpayPlus.Transaction(new Options(commerceCode, apiKey, environment));

export const WebpayService = {
  /**
   * 1. Crear Transacción
   * @param buyOrder Orden de compra única
   * @param sessionId ID de sesión
   * @param amount Monto (CLP)
   * @param returnUrl URL de retorno
   */
  async create(buyOrder, sessionId, amount, returnUrl) {
    try {
      const response = await tx.create(buyOrder, sessionId, amount, returnUrl);
      return response;
    } catch (error) {
      console.error('Webpay Create Error:', error);
      throw new Error('Error al iniciar transacción con Webpay');
    }
  },

  /**
   * 2. Confirmar Transacción (Commit)
   * @param token Token recibido en return_url
   */
  async commit(token) {
    try {
      const response = await tx.commit(token);
      return response;
    } catch (error) {
      console.error('Webpay Commit Error:', error);
      // Importante: No lanzar error genérico si es rechazo, manejar según código
      throw error;
    }
  },

  /**
   * 3. Consultar Estado
   * @param token Token de la transacción
   */
  async status(token) {
    try {
      const response = await tx.status(token);
      return response;
    } catch (error) {
      console.error('Webpay Status Error:', error);
      throw error;
    }
  },

  /**
   * 4. Reembolsar (Refund)
   * @param token Token de la transacción
   * @param amount Monto a reembolsar
   */
  async refund(token, amount) {
    try {
      const response = await tx.refund(token, amount);
      return response;
    } catch (error) {
      console.error('Webpay Refund Error:', error);
      throw error;
    }
  }
};
