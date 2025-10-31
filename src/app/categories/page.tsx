'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { useOperationNotification } from '@/contexts/NotificationContext';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useConfirmation } from '@/hooks/useConfirmation';
import { LoadingSpinner, EmptyState, Badge, InputField, TextareaField, Modal } from '@/shared/components';

interface Subcategory {
  name: string;
  description: string;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  subcategories: Subcategory[];
  createdAt: string;
}

export default function CategoriesPage() {
  const { notifyError, notifyDeleted, notifyAdded, notifyUpdated } = useOperationNotification();
  const confirmation = useConfirmation();
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subcategories: [{ name: '', description: '' }]
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setOperationLoading(true);
    
    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory._id}`
        : '/api/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        setShowModal(false);
        setEditingCategory(null);
        setFormData({
          name: '',
          description: '',
          subcategories: [{ name: '', description: '' }]
        });
        fetchCategories();
        if (editingCategory) {
          notifyUpdated('Category');
        } else {
          notifyAdded('Category');
        }
      } else {
        notifyError(editingCategory ? 'Update' : 'Create', result.error || `Failed to ${editingCategory ? 'update' : 'save'} category`);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      notifyError(editingCategory ? 'Update' : 'Create', `Failed to ${editingCategory ? 'update' : 'save'} category`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description,
      subcategories: category.subcategories.length > 0 
        ? category.subcategories 
        : [{ name: '', description: '' }]
    });
    setShowModal(true);
  };

  const handleDelete = async (categoryId: string) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (!confirmed) return;
    
    setOperationLoading(true);
    
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchCategories();
        notifyDeleted('Category');
      } else {
        notifyError('Delete', result.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      notifyError('Delete', 'Failed to delete category');
    } finally {
      setOperationLoading(false);
    }
  };

  const addSubcategory = () => {
    setFormData({
      ...formData,
      subcategories: [...formData.subcategories, { name: '', description: '' }]
    });
  };

  const removeSubcategory = (index: number) => {
    setFormData({
      ...formData,
      subcategories: formData.subcategories.filter((_, i) => i !== index)
    });
  };

  const updateSubcategory = (index: number, field: keyof Subcategory, value: string) => {
    const updated = formData.subcategories.map((sub, i) => 
      i === index ? { ...sub, [field]: value } : sub
    );
    setFormData({ ...formData, subcategories: updated });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container-fluid mt-4">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <LoadingSpinner 
              config={{ 
                size: 'medium',
                variant: 'primary',
                showText: true,
                text: 'Loading categories...'
              }}
            />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="bi bi-tags me-2"></i>
              Categories
            </h1>
            <button
              className="btn btn-primary"
              onClick={() => {
                setEditingCategory(null);
                setFormData({
                  name: '',
                  description: '',
                  subcategories: [{ name: '', description: '' }]
                });
                setShowModal(true);
              }}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Category
            </button>
          </div>

          <div className="row">
            {categories.length === 0 && !loading ? (
              <div className="col-12">
                <EmptyState 
                  icon="🏷️"
                  title="No Categories Yet"
                  description="Create your first category to organize and track your expenses."
                  size="large"
                  actions={[{
                    label: 'Create Category',
                    onClick: () => {
                      setFormData({ name: '', description: '', subcategories: [] });
                      setEditingCategory(null);
                      setShowModal(true);
                    },
                    variant: 'primary',
                    icon: 'plus'
                  }]}
                />
              </div>
            ) : (
              categories.map((category) => (
              <div key={category._id} className="col-md-6 col-lg-4 mb-4">
                <div className="card h-100">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">{category.name}</h5>
                    <div className="dropdown">
                      <button
                        className="btn btn-sm btn-outline-secondary dropdown-toggle"
                        type="button"
                        data-bs-toggle="dropdown"
                      >
                        <i className="bi bi-three-dots"></i>
                      </button>
                      <ul className="dropdown-menu">
                        <li>
                          <button
                            className="dropdown-item"
                            onClick={() => handleEdit(category)}
                          >
                            <i className="bi bi-pencil me-2"></i>Edit
                          </button>
                        </li>
                        <li>
                          <button
                            className="dropdown-item text-danger"
                            onClick={() => handleDelete(category._id)}
                          >
                            <i className="bi bi-trash me-2"></i>Delete
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="card-body">
                    <p className="card-text text-muted mb-3">{category.description}</p>
                    {category.subcategories && category.subcategories.length > 0 && (
                      <div>
                        <h6 className="mb-2">Subcategories:</h6>
                        <div className="d-flex flex-wrap gap-1">
                          {category.subcategories.map((sub, index) => (
                            <Badge key={index} variant="secondary">
                              {sub.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Modal
        show={showModal}
        onClose={() => setShowModal(false)}
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        size="lg"
        footer={
          <div className="d-flex justify-content-end gap-2">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowModal(false)}
              disabled={operationLoading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={operationLoading}
              form="category-form"
            >
              {operationLoading ? (
                <>
                  <LoadingSpinner config={{ size: 'small', showText: false }} className="me-2" />
                  {editingCategory ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingCategory ? 'Update' : 'Create'
              )}
            </button>
          </div>
        }
      >
        <form id="category-form" onSubmit={handleSubmit}>
          <InputField
            label="Name"
            type="text"
            value={formData.name}
            onChange={(value) => setFormData({ ...formData, name: value as string })}
            required
            placeholder="Enter category name"
          />
          
          <TextareaField
            label="Description"
            value={formData.description}
            onChange={(value) => setFormData({ ...formData, description: value as string })}
            required
            placeholder="Enter category description"
            rows={3}
          />
          
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label mb-0">Subcategories</label>
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={addSubcategory}
              >
                <i className="bi bi-plus"></i> Add
              </button>
            </div>
            
            {formData.subcategories.map((sub, index) => (
              <div key={index} className="row mb-2">
                <div className="col-5">
                  <InputField
                    label=""
                    type="text"
                    value={sub.name}
                    onChange={(value) => updateSubcategory(index, 'name', value as string)}
                    placeholder="Name"
                    size="sm"
                  />
                </div>
                <div className="col-5">
                  <InputField
                    label=""
                    type="text"
                    value={sub.description}
                    onChange={(value) => updateSubcategory(index, 'description', value as string)}
                    placeholder="Description"
                    size="sm"
                  />
                </div>
                <div className="col-2">
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={() => removeSubcategory(index)}
                    disabled={formData.subcategories.length === 1}
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        show={confirmation.show}
        title={confirmation.config?.title || ''}
        message={confirmation.config?.message || ''}
        confirmText={confirmation.config?.confirmText}
        cancelText={confirmation.config?.cancelText}
        type={confirmation.config?.type}
        onConfirm={confirmation.handleConfirm}
        onCancel={confirmation.handleCancel}
      />

      {operationLoading && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.1)', 
            zIndex: 9999,
            backdropFilter: 'blur(1px)'
          }}
        >
          <div className="processing-popup rounded p-3 shadow">
            <div className="d-flex align-items-center">
              <LoadingSpinner config={{ size: 'small', showText: false }} className="me-2" />
              <span>Processing...</span>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .dropdown:hover .dropdown-menu,
        .dropdown.show .dropdown-menu {
          z-index: 1050 !important;
          position: absolute !important;
        }
        .card:hover {
          z-index: 10;
          position: relative;
        }
        .dropdown-menu {
          z-index: 1050 !important;
        }
      `}</style>
    </MainLayout>
  );
}
