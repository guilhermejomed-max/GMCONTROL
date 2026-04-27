export interface Partner {
  id: string;
  name: string;
  cnpj?: string;
  phone?: string;
  address?: string;
  responsible?: string;
  services: { id: string; name: string; description?: string; cost: number }[];
  branchId?: string;
}
