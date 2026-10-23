export type PaymentInitPayload = {
  amount: number;
  currency: string;
  orderId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  productName: string;
  productCategory?: string;
};

export type PaymentInitResult = {
  gatewayTxnId: string;
  redirectUrl: string;
  raw?: any;
};

export type PaymentVerifyResult = {
  success: boolean;
  gatewayTxnId: string;
  gatewayRefId?: string;
  amount?: number;
  raw?: any;
  failureReason?: string;
};

export interface PaymentGateway {
  name: string;
  initiate(payload: PaymentInitPayload, paymentId: string): Promise<PaymentInitResult>;
  verify(gatewayTxnId: string, extra?: unknown): Promise<PaymentVerifyResult>;
  refund?(gatewayTxnId: string, amount: number, reason?: string): Promise<any>;
}
