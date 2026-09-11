import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { StatusBadge } from '../components/ui/Badge';
import { Dropdown } from '../components/ui/Dropdown';
import { Pagination } from '../components/ui/Pagination';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmModal } from '../components/ui/Modal';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../context/ToastContext';
import { Plus, Search, Filter, ArrowUpDown, MoreVertical, Eye, Edit2, Trash2, Flame, Sparkles, Package, Power } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Product } from '../types';

export const Products: React.FC = () => {
  const { products, deleteProduct, updateProduct, categories: adminCategories } = useAdmin();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Route-based default tab
  const getInitialBadge = () => {
    if (location.pathname.includes('best-sellers')) return 'bestSeller';
    if (location.pathname.includes('new-arrivals')) return 'newArrival';
    return 'All';
  };

  // Filters & Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedBadge, setSelectedBadge] = useState<string>(getInitialBadge());
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'sales'>('sales');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Sync state if user navigates via sidebar
  React.useEffect(() => {
    if (location.pathname.includes('best-sellers')) {
      setSelectedBadge('bestSeller');
      setCurrentPage(1);
    } else if (location.pathname.includes('new-arrivals')) {
      setSelectedBadge('newArrival');
      setCurrentPage(1);
    } else if (location.pathname === '/admin/products' || location.pathname === '/products') {
      setSelectedBadge('All');
      setCurrentPage(1);
    }
  }, [location.pathname]);

  const handleTabChange = (badge: string) => {
    setSelectedBadge(badge);
    setCurrentPage(1);
    if (badge === 'bestSeller') {
      navigate('/admin/products/best-sellers');
    } else if (badge === 'newArrival') {
      navigate('/admin/products/new-arrivals');
    } else {
      navigate('/admin/products');
    }
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Delete modal state
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // Categories list for dropdown
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set([...adminCategories.map((c) => c.name), ...products.map((p) => p.category)])).filter(Boolean)];
  }, [adminCategories, products]);

  // Filtered and sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (p.status === 'REJECTED' || (p as any).status === 'Rejected') return false;
        const matchesSearch =
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
        const matchesStatus = selectedStatus === 'All' || p.status === selectedStatus;
        const matchesBadge =
          selectedBadge === 'All' ||
          (selectedBadge === 'bestSeller' && p.isBestSeller) ||
          (selectedBadge === 'newArrival' && p.isNewArrival) ||
          (selectedBadge === 'featured' && p.featured);
        return matchesSearch && matchesCategory && matchesStatus && matchesBadge;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy === 'sales' ? 'salesCount' : sortBy];
        let valB: any = b[sortBy === 'sales' ? 'salesCount' : sortBy];

        if (sortBy === 'price') {
          valA = a.salePrice || a.price;
          valB = b.salePrice || b.price;
        }

        if (typeof valA === 'string') {
          return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [products, searchTerm, selectedCategory, selectedStatus, selectedBadge, sortBy, sortOrder]);

  // Paginated products
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = () => {
    if (productToDelete) {
      deleteProduct(productToDelete.id);
      showToast(`Product "${productToDelete.name}" deleted successfully`, 'success');
      setProductToDelete(null);
    }
  };

  const isBestSellerMode = selectedBadge === 'bestSeller';
  const isNewArrivalMode = selectedBadge === 'newArrival';

  let pageTitle = 'Products Catalog';
  let pageDescription = 'Manage your store catalog, pricing, variants, and stock';
  let breadcrumbs = [{ label: 'Catalog', href: '/admin/products' }, { label: 'All Products' }];

  if (isBestSellerMode) {
    pageTitle = '🔥 Best Seller Products';
    pageDescription = 'Manage toys currently highlighted as Best Sellers for customers to order';
    breadcrumbs = [{ label: 'Catalog', href: '/admin/products' }, { label: 'Best Sellers' }];
  } else if (isNewArrivalMode) {
    pageTitle = '✨ New Arrival Products';
    pageDescription = 'Manage fresh toy additions showcased as New Arrivals in the storefront';
    breadcrumbs = [{ label: 'Catalog', href: '/admin/products' }, { label: 'New Arrivals' }];
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={pageTitle}
        description={pageDescription}
        breadcrumbs={breadcrumbs}
        actions={
          <Button
            onClick={() => navigate('/admin/products/new')}
            leftIcon={<Plus className="w-4 h-4" />}
            size="md"
          >
            Add Product
          </Button>
        }
      />

      {/* Quick View Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handleTabChange('All')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedBadge === 'All'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>All Products</span>
          <span
            className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
              selectedBadge === 'All' ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {products.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('bestSeller')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedBadge === 'bestSeller'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-800 border border-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-amber-300 fill-amber-200" />
          <span>🔥 Best Sellers</span>
          <span
            className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
              selectedBadge === 'bestSeller' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-800'
            }`}
          >
            {products.filter((p) => p.isBestSeller).length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('newArrival')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            selectedBadge === 'newArrival'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
          <span>✨ New Arrivals</span>
          <span
            className={`px-2 py-0.2 rounded-full text-[10px] font-extrabold ${
              selectedBadge === 'newArrival' ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {products.filter((p) => p.isNewArrival).length}
          </span>
        </button>
      </div>

      <Card>
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products by name, SKU..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:bg-white transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Category filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none focus:outline-none text-xs text-slate-700 cursor-pointer font-medium"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c === 'All' ? 'All Categories' : c}
                  </option>
                ))}
              </select>
            </div>

            {/* Status filter */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none focus:outline-none text-xs text-slate-700 cursor-pointer font-medium"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Out of Stock">Out of Stock</option>
              </select>
            </div>

            {/* Badge filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
              <Flame className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedBadge}
                onChange={(e) => {
                  setSelectedBadge(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent border-none focus:outline-none text-xs text-slate-700 cursor-pointer font-medium"
              >
                <option value="All">All Badges</option>
                <option value="bestSeller">🔥 Best Sellers</option>
                <option value="newArrival">✨ New Arrivals</option>
                <option value="featured">⭐ Featured Only</option>
              </select>
            </div>

            {/* Sort filter */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-600">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none focus:outline-none text-xs text-slate-700 cursor-pointer font-medium"
              >
                <option value="sales">Sort: Best Selling</option>
                <option value="name">Sort: Name</option>
                <option value="price">Sort: Price</option>
                <option value="stock">Sort: Stock Level</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-700 ml-1 px-1"
                title={`Current: ${sortOrder.toUpperCase()}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        {/* Content Table */}
        <CardContent className="p-0">
          {paginatedProducts.length === 0 ? (
            <EmptyState
              title="No products found"
              description="There are no products matching your search or active filters."
              actionLabel="Reset Filters"
              onAction={() => {
                setSearchTerm('');
                setSelectedCategory('All');
                setSelectedStatus('All');
                setSelectedBadge('All');
              }}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Badges / Tags</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="w-14">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-11 h-11 rounded-lg object-cover border border-slate-200 shadow-2xs"
                      />
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-xs truncate hover:text-indigo-600">
                          {product.name}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate mt-0.5">
                          {product.shortDescription}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 font-medium">
                      {product.sku}
                    </TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        {product.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs">
                          ₹{(product.salePrice || product.price).toLocaleString()}
                        </span>
                        {product.salePrice && product.salePrice < product.price && (
                          <span className="text-[10px] text-slate-400 line-through">
                            ₹{product.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-semibold text-xs ${
                            product.stock <= 5 ? 'text-amber-600 font-bold' : 'text-slate-800'
                          }`}
                        >
                          {product.stock}
                        </span>
                        <span className="text-[11px] text-slate-400">units</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={product.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5 py-0.5">
                        {/* Best Seller toggle checkbox */}
                        <label
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer select-none border ${
                            product.isBestSeller
                              ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/20 shadow-2xs'
                              : 'bg-slate-50/70 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                          title={`Click checkbox to toggle Best Seller tag for ${product.name}`}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(product.isBestSeller)}
                            onChange={(e) => {
                              updateProduct(product.id, {
                                isBestSeller: e.target.checked,
                                status: e.target.checked ? 'Active' : product.status,
                              });
                              showToast(
                                `"${product.name}" ${e.target.checked ? 'added to 🔥 Best Sellers' : 'removed from Best Sellers'}`,
                                'success'
                              );
                            }}
                            className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="flex items-center gap-1">
                            <Flame
                              className={`w-3 h-3 ${
                                product.isBestSeller ? 'text-amber-500 fill-amber-400' : 'text-slate-400'
                              }`}
                            />
                            Best Seller
                          </span>
                        </label>

                        {/* New Arrival toggle checkbox */}
                        <label
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer select-none border ${
                            product.isNewArrival
                              ? 'bg-emerald-50 text-emerald-900 border-emerald-300 ring-1 ring-emerald-400/20 shadow-2xs'
                              : 'bg-slate-50/70 text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                          title={`Click checkbox to toggle New Arrival tag for ${product.name}`}
                        >
                          <input
                            type="checkbox"
                            checked={Boolean(product.isNewArrival)}
                            onChange={(e) => {
                              updateProduct(product.id, {
                                isNewArrival: e.target.checked,
                                status: e.target.checked ? 'Active' : product.status,
                              });
                              showToast(
                                `"${product.name}" ${e.target.checked ? 'added to ✨ New Arrivals' : 'removed from New Arrivals'}`,
                                'success'
                              );
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span className="flex items-center gap-1">
                            <Sparkles
                              className={`w-3 h-3 ${
                                product.isNewArrival ? 'text-emerald-500' : 'text-slate-400'
                              }`}
                            />
                            New Arrival
                          </span>
                        </label>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dropdown
                        trigger={
                          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                        items={[
                          {
                            label: 'View Product',
                            icon: <Eye className="w-3.5 h-3.5" />,
                            onClick: () => navigate(`/admin/products/${product.id}/edit`),
                          },
                          {
                            label: 'Edit Product',
                            icon: <Edit2 className="w-3.5 h-3.5" />,
                            onClick: () => navigate(`/admin/products/${product.id}/edit`),
                          },
                          {
                            label: product.isBestSeller ? 'Remove from Best Sellers' : 'Mark as Best Seller',
                            icon: <Flame className="w-3.5 h-3.5 text-amber-500" />,
                            onClick: () => {
                              updateProduct(product.id, { isBestSeller: !product.isBestSeller });
                              showToast(
                                `"${product.name}" ${!product.isBestSeller ? 'marked as 🔥 Best Seller' : 'removed from Best Sellers'}`,
                                'success'
                              );
                            },
                          },
                          {
                            label: product.isNewArrival ? 'Remove from New Arrivals' : 'Mark as New Arrival',
                            icon: <Sparkles className="w-3.5 h-3.5 text-emerald-500" />,
                            onClick: () => {
                              updateProduct(product.id, { isNewArrival: !product.isNewArrival });
                              showToast(
                                `"${product.name}" ${!product.isNewArrival ? 'marked as ✨ New Arrival' : 'removed from New Arrivals'}`,
                                'success'
                              );
                            },
                          },
                          {
                            label: product.isActive !== false ? 'Deactivate Product' : 'Activate Product',
                              icon: <Power className="w-3.5 h-3.5 text-slate-500" />,
                              onClick: () => {
                                updateProduct(product.id, { isActive: product.isActive === false ? true : false });
                                showToast(`Product ${product.isActive !== false ? 'deactivated' : 'activated'} successfully`, 'success');
                              },
                            },
                            {
                              label: 'Delete Product',
                            icon: <Trash2 className="w-3.5 h-3.5 text-rose-500" />,
                            danger: true,
                            onClick: () => setProductToDelete(product),
                          },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredProducts.length}
            itemsPerPage={itemsPerPage}
            onPageChange={(p) => setCurrentPage(p)}
          />
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <ConfirmModal
          isOpen={!!productToDelete}
          onClose={() => setProductToDelete(null)}
          onConfirm={handleDelete}
          title="Delete Product?"
          message={`Are you sure you want to delete "${productToDelete.name}"? This will remove the item from catalog and inventory.`}
          confirmText="Delete Product"
          isDanger
        />
      )}
    </div>
  );
};
