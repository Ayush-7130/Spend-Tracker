'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { useOperationNotification } from '@/contexts/NotificationContext';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useConfirmation } from '@/hooks/useConfirmation';

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
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading categories...</p>
            </div>
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
                <div className="text-center py-5">
                  <i className="bi bi-tags fs-1 text-muted"></i>
                  <h4 className="mt-3 text-muted">No Categories Yet</h4>
                  <p className="text-muted mb-3">Create your first category to organize expenses</p>
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
                    Add your first category
                  </button>
                </div>
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
                            <span key={index} className="badge bg-secondary">
                              {sub.name}
                            </span>
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

      {/* Modal */}
      {showModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      required
                    ></textarea>
                  </div>
                  
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
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Name"
                            value={sub.name}
                            onChange={(e) => updateSubcategory(index, 'name', e.target.value)}
                          />
                        </div>
                        <div className="col-5">
                          <input
                            type="text"
                            className="form-control"
                            placeholder="Description"
                            value={sub.description}
                            onChange={(e) => updateSubcategory(index, 'description', e.target.value)}
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
                </div>
                <div className="modal-footer">
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
                  >
                    {operationLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        {editingCategory ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingCategory ? 'Update' : 'Create'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
          <div className="bg-white rounded p-3 shadow">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
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
