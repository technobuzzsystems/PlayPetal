import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Select } from '../components/ui/Select';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../context/ToastContext';
import { Layers, Sparkles, Plus, Trash2, Check, RefreshCw } from 'lucide-react';
import type { ProductVariant } from '../types';

export const Variants: React.FC = () => {
  const { products, attributes } = useAdmin();
  const { showToast } = useToast();

  const [selectedProductId, setSelectedProductId] = useState<string>(products[5]?.id || products[0]?.id);

  // Variant generator selections
  const [selectedColorAttr, setSelectedColorAttr] = useState<string[]>(['Red', 'Blue']);
  const [selectedSizeAttr, setSelectedSizeAttr] = useState<string[]>(['S', 'M']);

  // Current active variants
  const [variants, setVariants] = useState<ProductVariant[]>([
    { id: 'v-1', sku: 'TS-R-S', color: 'Red', size: 'S', price: 499, stock: 20 },
    { id: 'v-2', sku: 'TS-R-M', color: 'Red', size: 'M', price: 499, stock: 15 },
    { id: 'v-3', sku: 'TS-B-S', color: 'Blue', size: 'S', price: 499, stock: 12 },
    { id: 'v-4', sku: 'TS-B-M', color: 'Blue', size: 'M', price: 499, stock: 18 },
  ]);

  const selectedProduct = products.find((p) => p.id === selectedProductId) || products[0];

  // Colors and sizes available from Attributes store
  const colorAttribute = attributes.find((a) => a.name.toLowerCase() === 'color') || {
    values: ['Red', 'Blue', 'Green', 'Yellow'],
  };
  const sizeAttribute = attributes.find((a) => a.name.toLowerCase() === 'size') || {
    values: ['XS', 'S', 'M', 'L', 'XL'],
  };

  const handleGenerateCombinations = () => {
    if (selectedColorAttr.length === 0 || selectedSizeAttr.length === 0) {
      showToast('Select at least one color and one size to generate combinations', 'warning');
      return;
    }

    const generated: ProductVariant[] = [];
    const baseSku = selectedProduct.sku || 'TS-KIDS';
    const basePrice = selectedProduct.salePrice || selectedProduct.price || 499;

    selectedColorAttr.forEach((col) => {
      selectedSizeAttr.forEach((sz) => {
        const sku = `${baseSku}-${col[0]}-${sz}`;
        generated.push({
          id: `var-${col}-${sz}-${Date.now()}`,
          sku,
          color: col,
          size: sz,
          price: basePrice,
          stock: 15,
        });
      });
    });

    setVariants(generated);
    showToast(`Generated ${generated.length} variant combinations!`, 'success');
  };

  const updateVariantRow = (id: string, field: keyof ProductVariant, val: any) => {
    setVariants((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: val } : v))
    );
  };

  const removeVariantRow = (id: string) => {
    setVariants((prev) => prev.filter((v) => v.id !== id));
    showToast('Variant removed', 'info');
  };

  const addNewCustomVariant = () => {
    const newV: ProductVariant = {
      id: `v-custom-${Date.now()}`,
      sku: `${selectedProduct.sku || 'ITEM'}-VAR-${variants.length + 1}`,
      color: 'Red',
      size: 'L',
      price: selectedProduct.salePrice || selectedProduct.price || 499,
      stock: 10,
    };
    setVariants([...variants, newV]);
    showToast('Custom variant row added', 'info');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Variants"
        description="Generate and manage multi-attribute variations (Size, Color, Price, and SKU)"
        breadcrumbs={[{ label: 'Catalog', href: '/admin/products' }, { label: 'Variants' }]}
        actions={
          <Button
            size="md"
            onClick={() => showToast('All variant adjustments saved in memory', 'success')}
            leftIcon={<Check className="w-4 h-4" />}
          >
            Save Variant Changes
          </Button>
        }
      />

      {/* Product Selector */}
      <Card>
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={selectedProduct?.image}
              alt={selectedProduct?.name}
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs"
            />
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Selected Product
              </span>
              <h3 className="text-sm font-bold text-slate-900">{selectedProduct?.name}</h3>
              <p className="text-xs text-slate-500">
                Base SKU: <span className="font-mono">{selectedProduct?.sku}</span> • Base Price: ₹
                {selectedProduct?.salePrice || selectedProduct?.price}
              </p>
            </div>
          </div>

          <div className="w-full sm:w-64">
            <Select
              label="Switch Product"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              options={products.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
        </div>
      </Card>

      {/* Matrix Generator Controls */}
      <Card>
        <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <CardTitle>Automatic Variant Matrix Generator</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Pick colors and sizes to generate SKUs and pricing rows
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="w-full sm:w-auto"
            onClick={handleGenerateCombinations}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Generate Combinations
          </Button>
        </CardHeader>

        <CardContent className="pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Color multi-select */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-800 block mb-2">
                1. Select Colors ({selectedColorAttr.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {colorAttribute.values.map((col) => {
                  const isChecked = selectedColorAttr.includes(col);
                  return (
                    <button
                      type="button"
                      key={col}
                      onClick={() => {
                        setSelectedColorAttr(
                          isChecked
                            ? selectedColorAttr.filter((c) => c !== col)
                            : [...selectedColorAttr, col]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {col}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Size multi-select */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
              <span className="text-xs font-bold text-slate-800 block mb-2">
                2. Select Sizes ({selectedSizeAttr.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {sizeAttribute.values.map((sz) => {
                  const isChecked = selectedSizeAttr.includes(sz);
                  return (
                    <button
                      type="button"
                      key={sz}
                      onClick={() => {
                        setSelectedSizeAttr(
                          isChecked
                            ? selectedSizeAttr.filter((s) => s !== sz)
                            : [...selectedSizeAttr, sz]
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        isChecked
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generated Variants Table */}
      <Card>
        <CardHeader className="flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <CardTitle>Active Variants ({variants.length})</CardTitle>
          </div>
          <Button size="xs" variant="secondary" className="w-full sm:w-auto" onClick={addNewCustomVariant} leftIcon={<Plus className="w-3 h-3" />}>
            Add Custom Variant
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Color</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price (₹)</TableHead>
                <TableHead>Stock (Units)</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.map((v) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <input
                      type="text"
                      value={v.color || ''}
                      onChange={(e) => updateVariantRow(v.id, 'color', e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-28 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="text"
                      value={v.size || ''}
                      onChange={(e) => updateVariantRow(v.id, 'size', e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-20 font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="text"
                      value={v.sku}
                      onChange={(e) => updateVariantRow(v.id, 'sku', e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-36 font-mono focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={v.price}
                      onChange={(e) => updateVariantRow(v.id, 'price', Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-28 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={v.stock}
                      onChange={(e) => updateVariantRow(v.id, 'stock', Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs w-24 font-bold text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-500"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      onClick={() => removeVariantRow(v.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Remove variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
