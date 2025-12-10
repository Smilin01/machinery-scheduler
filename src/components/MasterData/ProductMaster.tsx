import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Product, ProcessStep } from '../../types';
import { Plus, Edit2, Trash2, Save, X, Copy, Download, Upload, Package, Layers, Clock, Settings, Activity } from 'lucide-react';

const ProductMaster: React.FC = () => {
  const { products, machines, addProduct, updateProduct, deleteProduct } = useApp();

  // Export products to CSV
  const exportProducts = () => {
    const csvContent = [
      ['Product Name', 'Part Number', 'Drawing Number', 'Priority', 'Category', 'Description', 'Material', 'Dimensions', 'Weight', 'Tolerance', 'Estimated Cost'],
      ...products.map(product => [
        product.productName,
        product.partNumber,
        product.drawingNumber,
        product.priority,
        product.category,
        product.description,
        product.specifications.material,
        product.specifications.dimensions,
        product.specifications.weight,
        product.specifications.tolerance,
        product.estimatedCost.toString()
      ])
    ].map(row => row.map(field => `"${field || ''}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import products from CSV
  const importProducts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');

      const importedProducts: Partial<Product>[] = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;

        const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
        const product: Partial<Product> = {
          productName: values[0] || '',
          partNumber: values[1] || `PN-${Date.now()}-${i}`,
          drawingNumber: values[2] || '',
          priority: (values[3] as Product['priority']) || 'medium',
          category: values[4] || '',
          description: values[5] || '',
          specifications: {
            material: values[6] || '',
            dimensions: values[7] || '',
            weight: values[8] || '',
            tolerance: values[9] || ''
          },
          estimatedCost: parseFloat(values[10]) || 0,
          processFlow: [],
          qualityStandards: []
        };

        if (product.productName) {
          importedProducts.push(product);
        }
      }

      // Add imported products
      importedProducts.forEach(product => {
        const newProduct: Product = {
          id: crypto.randomUUID(),
          productName: product.productName || '',
          partNumber: product.partNumber || `PN-${Date.now()}`,
          drawingNumber: product.drawingNumber || '',
          processFlow: product.processFlow || [],
          priority: product.priority || 'medium',
          category: product.category || '',
          description: product.description || '',
          specifications: product.specifications || { material: '', dimensions: '', weight: '', tolerance: '' },
          qualityStandards: product.qualityStandards || [],
          estimatedCost: product.estimatedCost || 0
        };
        addProduct(newProduct);
      });

      alert(`Successfully imported ${importedProducts.length} products`);
    };
    reader.readAsText(file);

    // Reset input
    event.target.value = '';
  };

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    productName: '',
    partNumber: '',
    drawingNumber: '',
    processFlow: [],
    priority: 'medium',
    category: '',
    description: '',
    specifications: {
      material: '',
      dimensions: '',
      weight: '',
      tolerance: '',
    },
    qualityStandards: [],
    estimatedCost: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateProduct(editingId, formData);
      setEditingId(null);
    } else {
      const newProduct: Product = {
        id: crypto.randomUUID(),
        productName: formData.productName || '',
        partNumber: formData.partNumber || `PN-${Date.now()}`,
        drawingNumber: formData.drawingNumber || '',
        processFlow: formData.processFlow || [],
        priority: formData.priority || 'medium',
        category: formData.category || '',
        description: formData.description || '',
        specifications: {
          material: formData.specifications?.material || '',
          dimensions: formData.specifications?.dimensions || '',
          weight: formData.specifications?.weight || '',
          tolerance: formData.specifications?.tolerance || '',
        },
        qualityStandards: formData.qualityStandards || [],
        estimatedCost: formData.estimatedCost || 0,
      };
      addProduct(newProduct);
    }
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      productName: '',
      partNumber: '',
      processFlow: [],
      priority: 'medium',
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleEdit = (product: Product) => {
    setFormData(product);
    setEditingId(product.id);
    setIsAdding(true);
  };

  const handleDuplicate = (product: Product) => {
    // Remove id and generate a new one, optionally tweak part number
    const duplicated = {
      ...product,
      id: crypto.randomUUID(),
      partNumber: product.partNumber + '-COPY',
      productName: product.productName + ' (Copy)',
    };
    setFormData(duplicated);
    setIsAdding(true);
    setEditingId(null);
  };

  const addProcessStep = () => {
    const newStep: ProcessStep = {
      id: crypto.randomUUID(),
      machineId: '',
      cycleTimePerPart: 0,
      sequence: (formData.processFlow?.length || 0) + 1,
      stepName: '',
      setupTime: 0,
      isOutsourced: false,
      qualityCheckRequired: false,
      toolsRequired: [],
      preferredMachines: [], // NEW
    };
    setFormData(prev => ({
      ...prev,
      processFlow: [...(prev.processFlow || []), newStep]
    }));
  };

  const updateProcessStep = (stepId: string, updates: Partial<ProcessStep>) => {
    setFormData(prev => ({
      ...prev,
      processFlow: prev.processFlow?.map(step =>
        step.id === stepId ? { ...step, ...updates } : step
      ) || []
    }));
  };

  const removeProcessStep = (stepId: string) => {
    setFormData(prev => ({
      ...prev,
      processFlow: prev.processFlow?.filter(step => step.id !== stepId) || []
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Product Management</h2>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer shadow-sm">
            <Upload size={16} />
            Import CSV
            <input type="file" accept=".csv" onChange={importProducts} className="hidden" />
          </label>
          <button
            onClick={exportProducts}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] transition-colors shadow-lg shadow-orange-200 font-medium text-sm"
          >
            <Plus size={16} />
            Add Product
          </button>
        </div>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={resetForm}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Basic Information */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Package size={16} className="text-[#F24E1E]" />
                  Basic Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Name</label>
                    <input
                      type="text"
                      value={formData.productName}
                      onChange={(e) => setFormData(prev => ({ ...prev, productName: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Part Number</label>
                    <input
                      type="text"
                      value={formData.partNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, partNumber: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as Product['priority'] }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Specifications */}
              <div>
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Settings size={16} className="text-[#F24E1E]" />
                  Specifications
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Material</label>
                    <input
                      type="text"
                      value={formData.specifications?.material}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        specifications: { ...prev.specifications!, material: e.target.value }
                      }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Estimated Cost</label>
                    <input
                      type="number"
                      value={formData.estimatedCost}
                      onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) }))}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Process Flow */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} className="text-[#F24E1E]" />
                    Process Flow
                  </h4>
                  <button
                    type="button"
                    onClick={addProcessStep}
                    className="text-sm text-[#F24E1E] font-medium hover:underline flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Step
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.processFlow?.map((step, index) => (
                    <div key={step.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200 relative group">
                      <button
                        type="button"
                        onClick={() => removeProcessStep(step.id)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Step Name</label>
                          <input
                            type="text"
                            value={step.stepName}
                            onChange={(e) => updateProcessStep(step.id, { stepName: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all text-sm"
                            placeholder="e.g. Cutting"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Machine</label>
                          <select
                            value={step.machineId}
                            onChange={(e) => updateProcessStep(step.id, { machineId: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all text-sm"
                          >
                            <option value="">Select Machine</option>
                            {machines.map(m => (
                              <option key={m.id} value={m.id}>{m.machineName}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Cycle Time (min)</label>
                          <input
                            type="number"
                            value={step.cycleTimePerPart}
                            onChange={(e) => updateProcessStep(step.id, { cycleTimePerPart: parseFloat(e.target.value) })}
                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F24E1E]/20 focus:border-[#F24E1E] transition-all text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!formData.processFlow || formData.processFlow.length === 0) && (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
                      <Layers size={24} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No process steps defined yet.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#F24E1E] text-white rounded-xl hover:bg-[#d63d12] transition-colors shadow-lg shadow-orange-200 font-medium flex items-center gap-2"
                >
                  <Save size={18} />
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Name</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Part Number</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Steps</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{product.productName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.partNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {product.category || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(product.priority)}`}>
                      {product.priority.charAt(0).toUpperCase() + product.priority.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Layers size={14} />
                      {product.processFlow.length}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDuplicate(product)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Package size={48} className="mx-auto mb-3 opacity-20" />
                    <p>No products found. Add one to get started.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductMaster;