import { IPayoutProvider } from './types';
import { SandboxPayoutProvider } from './SandboxPayoutProvider';

export * from './types';
export * from './SandboxPayoutProvider';

let currentPayoutProvider: IPayoutProvider = new SandboxPayoutProvider();

export function getPayoutProvider(): IPayoutProvider {
  return currentPayoutProvider;
}

export function setPayoutProvider(provider: IPayoutProvider): void {
  currentPayoutProvider = provider;
}
