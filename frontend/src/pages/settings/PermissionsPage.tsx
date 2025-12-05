import React, { useEffect, useState } from 'react';
import { permissionsService, Role, Permission, PermissionModule } from '@/api/permissionsService';
import toast from 'react-hot-toast';

const PermissionsPage: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissionModules, setPermissionModules] = useState<PermissionModule[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'roles' | 'permissions'>('roles');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [rolesData, permModules] = await Promise.all([
        permissionsService.getAllRoles(),
        permissionsService.getPermissionsByModule()
      ]);
      setRoles(rolesData);
      setPermissionModules(permModules);
    } catch (error) {
      toast.error('Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRolePermissions = async (roleId: number) => {
    try {
      const permissions = await permissionsService.getRolePermissions(roleId);
      setRolePermissions(permissions);
    } catch (error) {
      toast.error('Error al cargar permisos del rol');
    }
  };

  const handleSelectRole = (role: Role) => {
    setSelectedRole(role);
    loadRolePermissions(role.id);
  };

  const handleTogglePermission = async (roleId: number, permissionId: number, hasPermission: boolean) => {
    try {
      if (hasPermission) {
        await permissionsService.removePermissionFromRole(roleId, permissionId);
        toast.success('Permiso removido');
      } else {
        await permissionsService.assignPermissionToRole(roleId, permissionId);
        toast.success('Permiso asignado');
      }
      loadRolePermissions(roleId);
    } catch (error) {
      toast.error('Error al actualizar permiso');
    }
  };

  const hasPermission = (permissionId: number) => {
    return rolePermissions.some(p => p.id === permissionId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Permisos (RBAC)</h1>
          <p className="text-gray-600 mt-1">Administra roles y permisos del sistema</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-white rounded-lg shadow">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('roles')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'roles'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Roles y Permisos
            </button>
            <button
              onClick={() => setActiveTab('permissions')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'permissions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Todos los Permisos
            </button>
          </div>
        </div>

        {activeTab === 'roles' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Roles List */}
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-lg font-bold mb-4">Roles del Sistema</h2>
              <div className="space-y-2">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedRole?.id === role.id
                        ? 'bg-blue-100 border-2 border-blue-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{role.name}</div>
                        <div className="text-xs text-gray-600">{role.code}</div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {role.is_system && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">Sistema</span>
                        )}
                        <span className={`px-2 py-0.5 text-xs rounded ${role.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {role.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                    {role.description && (
                      <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Permissions */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-4">
              {selectedRole ? (
                <>
                  <div className="mb-4">
                    <h2 className="text-lg font-bold">Permisos de: {selectedRole.name}</h2>
                    <p className="text-sm text-gray-600">{selectedRole.description}</p>
                  </div>

                  <div className="space-y-4">
                    {permissionModules.map((module) => (
                      <div key={module.module} className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-3 text-gray-900 uppercase text-sm">
                          {module.module}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {module.permissions.map((permission) => {
                            const has = hasPermission(permission.id);
                            return (
                              <label
                                key={permission.id}
                                className="flex items-start p-2 rounded hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={has}
                                  onChange={() => handleTogglePermission(selectedRole.id, permission.id, has)}
                                  disabled={selectedRole.is_system}
                                  className="mt-1 mr-3"
                                />
                                <div className="flex-1">
                                  <div className="text-sm font-medium">{permission.name}</div>
                                  <div className="text-xs text-gray-500">{permission.code}</div>
                                  {permission.description && (
                                    <div className="text-xs text-gray-400 mt-0.5">{permission.description}</div>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedRole.is_system && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ⚠️ Este es un rol del sistema y no se pueden modificar sus permisos directamente.
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>Selecciona un rol para ver y editar sus permisos</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* All Permissions View */
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold mb-4">Todos los Permisos del Sistema</h2>
            <div className="space-y-6">
              {permissionModules.map((module) => (
                <div key={module.module}>
                  <h3 className="font-semibold text-lg mb-3 text-gray-900 uppercase border-b pb-2">
                    {module.module}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {module.permissions.map((permission) => (
                      <div key={permission.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-medium text-sm">{permission.name}</div>
                          {permission.is_system && (
                            <span className="px-1.5 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">Sistema</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mb-1">{permission.code}</div>
                        {permission.description && (
                          <div className="text-xs text-gray-500">{permission.description}</div>
                        )}
                        <div className="mt-2 text-xs text-gray-400">
                          {permission.module}.{permission.action}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionsPage;
