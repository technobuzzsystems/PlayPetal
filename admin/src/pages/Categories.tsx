import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { Switch } from '../components/ui/Switch';
import { EmptyState } from '../components/ui/EmptyState';
import { useAdmin } from '../context/AdminContext';
import { useToast } from '../context/ToastContext';
import {
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  FolderTree,
  Star,
} from 'lucide-react';
import type { Category } from '../types';

export const Categories: React.FC = () => {
  const { categories, addCategory, updateCategory, deleteCategory } = useAdmin();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'cat-1': true,
    'cat-1-1': true,
    'cat-2': true,
  });

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParentId, setFormParentId] = useState<string>('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formImage, setFormImage] = useState(
    'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=200&auto=format&fit=crop&q=60'
  );

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openAddModal = (parentId?: string) => {
    setEditingCategory(null);
    setFormName('');
    setFormSlug('');
    setFormDescription('');
    setFormParentId(parentId || '');
    setFormStatus('Active');
    setFormFeatured(false);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormDescription(cat.description);
    setFormParentId(cat.parentId || '');
    setFormStatus(cat.status);
    setFormFeatured(cat.featured);
    setFormImage(cat.image);
    setIsModalOpen(true);
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Category name is required', 'error');
      return;
    }

    const slug = formSlug.trim() || formName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    if (editingCategory) {
      updateCategory(editingCategory.id, {
        name: formName,
        slug,
        description: formDescription,
        status: formStatus,
        featured: formFeatured,
        image: formImage,
      });
      showToast(`Category "${formName}" updated`, 'success');
    } else {
      addCategory({
        name: formName,
        slug,
        description: formDescription,
        parentId: formParentId || null,
        status: formStatus,
        featured: formFeatured,
        sortOrder: 1,
        image: formImage,
      });
      showToast(`Category "${formName}" created`, 'success');
    }

    setIsModalOpen(false);
  };

  const handleDeleteCategory = () => {
    if (categoryToDelete) {
      deleteCategory(categoryToDelete.id);
      showToast(`Category "${categoryToDelete.name}" deleted`, 'success');
      setCategoryToDelete(null);
    }
  };

  // Flatten categories list for the Parent Category dropdown
  const getAllCategoriesFlat = (cats: Category[], prefix = ''): { id: string; name: string }[] => {
    let list: { id: string; name: string }[] = [];
    for (const c of cats) {
      list.push({ id: c.id, name: `${prefix}${c.name}` });
      if (c.children) {
        list = [...list, ...getAllCategoriesFlat(c.children, `${prefix}— `)];
      }
    }
    return list;
  };

  // Recursive Table Row Render for Hierarchy
  const renderCategoryRows = (cats: Category[], level = 0): React.ReactNode => {
    return cats.map((cat) => {
      const hasChildren = Boolean(cat.children && cat.children.length > 0);
      const isExpanded = Boolean(expandedIds[cat.id]);

      // Simple search filter check
      if (search && !cat.name.toLowerCase().includes(search.toLowerCase())) {
        if (!hasChildren) return null;
      }

      return (
        <React.Fragment key={cat.id}>
          <tr className="hover:bg-slate-50/80 transition-colors group">
            {/* Name with indentation & expand toggle */}
            <td className="px-4 py-3.5 text-sm">
              <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpand(cat.id)}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <span className="w-6" />
                )}

                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0"
                />

                <div className="flex flex-col">
                  <span className="font-semibold text-slate-900 text-xs">{cat.name}</span>
                  <span className="text-[11px] text-slate-400 truncate max-w-xs">{cat.description}</span>
                </div>
              </div>
            </td>

            {/* Slug */}
            <td className="px-4 py-3.5 font-mono text-xs text-slate-500">
              /{cat.slug}
            </td>

            {/* Items Count */}
            <td className="px-4 py-3.5 text-xs text-slate-700 font-medium">
              {cat.itemCount} items
            </td>

            {/* Status */}
            <td className="px-4 py-3.5">
              <StatusBadge status={cat.status} />
            </td>

            {/* Featured */}
            <td className="px-4 py-3.5">
              {cat.featured ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-500" /> Featured
                </span>
              ) : (
                <span className="text-slate-400 text-xs">—</span>
              )}
            </td>

            {/* Actions */}
            <td className="px-4 py-3.5 text-right">
              <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                <button
                  onClick={() => openAddModal(cat.id)}
                  title="Add Subcategory"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-pink-50 transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  onClick={() => openEditModal(cat)}
                  title="Edit Category"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCategoryToDelete(cat)}
                  title="Delete Category"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>

          {/* Render children if expanded */}
          {hasChildren && isExpanded && renderCategoryRows(cat.children!, level + 1)}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Categories"
        description="Organize hierarchical product categories and subcategories for easy customer navigation"
        breadcrumbs={[{ label: 'Catalog', href: '/admin/products' }, { label: 'Categories' }]}
        actions={
          <Button
            onClick={() => openAddModal()}
            leftIcon={<Plus className="w-4 h-4" />}
            size="md"
          >
            Add Category
          </Button>
        }
      />

      <Card>
        {/* Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-initial"
              onClick={() => {
                const allOpen: Record<string, boolean> = {};
                const openAll = (list: Category[]) => {
                  for (const item of list) {
                    allOpen[item.id] = true;
                    if (item.children) openAll(item.children);
                  }
                };
                openAll(categories);
                setExpandedIds(allOpen);
              }}
            >
              Expand All
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="flex-1 sm:flex-initial"
              onClick={() => setExpandedIds({})}
            >
              Collapse All
            </Button>
          </div>
        </div>

        <CardContent className="p-0">
          {categories.length === 0 ? (
            <EmptyState
              icon={<FolderTree className="w-8 h-8 text-slate-400" />}
              title="No categories found"
              description="Start organizing your catalog by creating top-level categories like Toys, Apparel, or Books."
              actionLabel="Add Category"
              onAction={() => openAddModal()}
            />
          ) : (
            <div className="w-full overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[650px] text-left border-collapse">
                <thead className="bg-slate-50/80 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Category Hierarchy
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Slug
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Products
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Featured
                    </th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {renderCategoryRows(categories)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        description="Configure category naming, parent nesting, and display images"
        size="lg"
        footer={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 w-full">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer text-center"
            >
              Cancel
            </button>
            <Button size="sm" className="w-full sm:w-auto" onClick={handleSaveCategory}>
              {editingCategory ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <Input
            label="Category Name *"
            placeholder="e.g. Soft Toys, Vehicles, Wooden Puzzles"
            value={formName}
            onChange={(e) => {
              setFormName(e.target.value);
              if (!editingCategory) {
                setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
              }
            }}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Slug (URL Key)"
              placeholder="e.g. soft-toys"
              value={formSlug}
              onChange={(e) => setFormSlug(e.target.value)}
            />

            <Select
              label="Parent Category (Optional)"
              value={formParentId}
              onChange={(e) => setFormParentId(e.target.value)}
            >
              <option value="">None (Top Level Category)</option>
              {getAllCategoriesFlat(categories).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <Textarea
            label="Description"
            placeholder="Brief description of products in this category..."
            rows={3}
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
          />

          {/* Image upload preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Category Image
            </label>
            <div className="flex items-center gap-4">
              <img
                src={formImage}
                alt="Category preview"
                className="w-16 h-16 rounded-xl object-cover border border-slate-200 shadow-2xs"
              />
              <div className="flex-1">
                <Input
                  label="Image URL"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <Select
              label="Status"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as any)}
              options={[
                { value: 'Active', label: 'Active (Visible on store)' },
                { value: 'Inactive', label: 'Inactive (Hidden)' },
              ]}
            />

            <div className="pt-5">
              <Switch
                label="Featured Category"
                description="Highlight on homepage"
                checked={formFeatured}
                onChange={setFormFeatured}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {categoryToDelete && (
        <ConfirmModal
          isOpen={!!categoryToDelete}
          onClose={() => setCategoryToDelete(null)}
          onConfirm={handleDeleteCategory}
          title="Delete Category?"
          message={`Are you sure you want to delete "${categoryToDelete.name}"? Subcategories and products mapped to it will need re-assignment.`}
          confirmText="Delete Category"
          isDanger
        />
      )}
    </div>
  );
};
