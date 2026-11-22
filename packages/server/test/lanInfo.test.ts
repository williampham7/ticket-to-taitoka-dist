import { describe, expect, it } from 'vitest';
import type { NetworkInterfaceInfo } from 'node:os';
import { lanAddresses } from '../src/lanInfo';

const v4 = (address: string, internal = false) => ({ address, family: 'IPv4', internal }) as NetworkInterfaceInfo;
const v6 = (address: string) => ({ address, family: 'IPv6', internal: false }) as NetworkInterfaceInfo;

describe('lanAddresses', () => {
  it('keeps external IPv4 addresses only', () => {
    expect(lanAddresses({ lo: [v4('127.0.0.1', true)], eth: [v6('fe80::1'), v4('10.0.0.5')] })).toEqual(['10.0.0.5']);
  });

  it('puts home-network (192.168.*) addresses first, then 10.*, then 172.16-31.*, then others', () => {
    const got = lanAddresses({
      a: [v4('172.20.1.2')],
      b: [v4('100.64.0.1')],
      c: [v4('10.1.1.1')],
      d: [v4('192.168.1.23')],
    });
    expect(got).toEqual(['192.168.1.23', '10.1.1.1', '172.20.1.2', '100.64.0.1']);
  });

  it('skips link-local 169.254.* addresses and tolerates missing interfaces', () => {
    expect(lanAddresses({ a: undefined, b: [v4('169.254.3.3'), v4('192.168.0.9')] })).toEqual(['192.168.0.9']);
  });
});
