import React, { useState } from "react";
import SupplierList, { Supplier } from "./SupplierList";
import SupplierDetail from "./SupplierDetail";

const SuppliersPage: React.FC = () => {
  const [selected, setSelected] = useState<Supplier | null>(null);

  if (selected) {
    return <SupplierDetail supplierId={selected._id} onBack={() => setSelected(null)} />;
  }

  return <SupplierList onView={(s) => setSelected(s)} />;
};

export default SuppliersPage;
