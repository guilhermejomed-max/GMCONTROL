export interface Partner {
  id: string;
  name: string;
  services: { id: string; name: string; description?: string; cost: number }[];
  branchId?: string;
}
