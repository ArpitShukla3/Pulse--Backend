type SmsPayload = {
  message: string;
  mobile: string;
};

const sendSMS = async ({ message, mobile }: SmsPayload): Promise<void> => {
  console.log(`Sending SMS to ${mobile} with message: ${message}`);
};

export default sendSMS;
