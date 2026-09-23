// Values placed on res.locals by the auth and validation middleware.
declare global {
  namespace Express {
    interface Locals {
      userId: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      body: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: any;
    }
  }
}

export {};
