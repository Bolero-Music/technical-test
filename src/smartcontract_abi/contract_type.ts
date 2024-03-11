type Components = {
  internalType: string;
  name: string;
  type: string;
};

export type ContractAbi = {
  constant?: boolean;
  payable?: boolean;
  inputs?: {
    components?: { internalType: string; name: string; type: string }[];
    indexed?: boolean;
    internalType: string;
    name: string;
    type: string;
  }[];
  outputs?: {
    indexed?: boolean;
    internalType: string;
    name: string;
    type: string;
    components?: {
      internalType: string;
      name: string;
      type: string;
      components?: Components[];
    }[];
  }[];
  anonymous?: boolean;
  name?: string;
  type?: string;
  stateMutability?: string;
}[];
