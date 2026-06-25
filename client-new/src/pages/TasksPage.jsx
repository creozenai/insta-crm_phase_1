import { API_URL } from '../config';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import CustomSelect from '../components/ui/CustomSelect';
import { 
 Calendar, 
 CheckSquare, 
 Square, 
 Trash2, 
 Plus, 
 Filter, 
 User, 
 CheckCircle2,
 Circle,
 Edit2,
 X,
 XCircle,
 Search,
 LayoutGrid,
 List
} from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Checkbox from '../components/ui/Checkbox';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import toast from 'react-hot-toast';

export default function TasksPage() {
 const { token, user } = useAuth();
 
 // Tasks state
 const [tasks, setTasks] = useState([]);
 const [loading, setLoading] = useState(true);
 const [selectedTaskIds, setSelectedTaskIds] = useState([]);
 const [visibleTasks, setVisibleTasks] = useState([]);
 
 // Filters
 const [statusFilters, setStatusFilters] = useState(['pending']);
 const [priorityFilters, setPriorityFilters] = useState([]);
 const [typeFilters, setTypeFilters] = useState([]);
 const [assigneeFilters, setAssigneeFilters] = useState([]);
 const [systemAgents, setSystemAgents] = useState([]);
 const [showAgentMenu, setShowAgentMenu] = useState(false);
 const agentMenuRef = React.useRef(null);
 const [sortBy, setSortBy] = useState('due_asc');
 const [dateFilter, setDateFilter] = useState('');
 const [customStartDate, setCustomStartDate] = useState('');
 const [customEndDate, setCustomEndDate] = useState('');
 const [showFilterMenu, setShowFilterMenu] = useState(false);
 const filterMenuRef = React.useRef(null);
 const [showDateMenu, setShowDateMenu] = useState(false);
 const dateMenuRef = React.useRef(null);
 
 // View Mode
 const [viewMode, setViewMode] = useState('table'); // 'grid' | 'table'

 useEffect(() => {
 const handleClickOutside = (event) => {
 if (filterMenuRef.current && !filterMenuRef.current.contains(event.target)) {
 setShowFilterMenu(false);
 }
 if (dateMenuRef.current && !dateMenuRef.current.contains(event.target)) {
 setShowDateMenu(false);
 }
 if (agentMenuRef.current && !agentMenuRef.current.contains(event.target)) {
 setShowAgentMenu(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 // Edit Task state
 const [editingTask, setEditingTask] = useState(null);
 const [editSaving, setEditSaving] = useState(false);
 const [editError, setEditError] = useState(null);

 // Search state
 const [searchQuery, setSearchQuery] = useState('');

 // Confirmation state
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);

 useEffect(() => {
 if (user?.role === 'admin') {
 const fetchAgents = async () => {
 try {
 const res = await fetch(`${API_URL}/api/leads/agents`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 if (res.ok) {
 const data = await res.json();
 setSystemAgents(data);
 }
 } catch (err) {
 console.error('Failed to fetch agents:', err);
 }
 };
 fetchAgents();
 }
 }, [user, token]);

 const fetchTasks = async () => {
 try {
 const params = new URLSearchParams();
 if (statusFilters.length > 0) params.append('status', statusFilters.join(','));
 if (priorityFilters.length > 0) params.append('priority', priorityFilters.join(','));
 if (typeFilters.length > 0) params.append('type', typeFilters.join(','));
 if (assigneeFilters.length > 0 && user?.role === 'admin') params.append('assignees', assigneeFilters.join(','));
 if (dateFilter) params.append('dateRange', dateFilter);
 if (dateFilter === 'custom') {
 if (customStartDate) params.append('startDate', customStartDate);
 if (customEndDate) params.append('endDate', customEndDate);
 }
 params.append('sort', sortBy);

 const res = await fetch(`${API_URL}/api/tasks?${params.toString()}`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const data = await res.json();
 if (res.ok) {
 setTasks(data);
 }
 } catch (err) {
 console.error(err);
 }
 };

 useEffect(() => {
 const initData = async () => {
 setLoading(true);
 await fetchTasks();
 setLoading(false);
 };
 if (token) {
 initData();
 }
 }, [token, statusFilters, priorityFilters, typeFilters, assigneeFilters, sortBy, dateFilter, customStartDate, customEndDate]);

 const handleUpdateTask = async (e) => {
 e.preventDefault();
 if (!editingTask) return;
 
 setEditSaving(true);
 setEditError(null);

 try {
 const res = await fetch(`${API_URL}/api/tasks/${editingTask._id}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 status: editingTask.status,
 type: editingTask.type,
 dueAt: editingTask.dueAt,
 notes: editingTask.notes,
 priority: editingTask.priority
 })
 });

 const data = await res.json();
 if (res.ok) {
 setTasks(prevTasks => prevTasks.map(t => t._id === data._id ? data : t));
 setEditingTask(null);
 } else {
 setEditError(data.error || 'Failed to update task');
 }
 } catch (err) {
 console.error(err);
 setEditError('Server error updating task');
 } finally {
 setEditSaving(false);
 }
 };

 const handleToggleSelectTask = (taskId) => {
 setSelectedTaskIds(prev => 
 prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
 );
 };

  const handleSelectAll = () => {
    const visibleTaskIds = visibleTasks.map(t => t._id);
    const allVisibleSelected = visibleTaskIds.length > 0 && visibleTaskIds.every(id => selectedTaskIds.includes(id));
    
    if (allVisibleSelected) {
      setSelectedTaskIds(prev => prev.filter(id => !visibleTaskIds.includes(id)));
    } else {
      setSelectedTaskIds(prev => {
        const newSelection = [...prev];
        for (const id of visibleTaskIds) {
          if (!newSelection.includes(id)) newSelection.push(id);
        }
        return newSelection;
      });
    }
  };

 const handleDeleteSelected = () => {
 setShowDeleteConfirm(true);
 };

 const confirmDelete = async () => {
 setIsDeleting(true);
 try {
 await Promise.all(
 selectedTaskIds.map(id => fetch(`${API_URL}/api/tasks/${id}`, { 
 method: 'DELETE', 
 headers: { 'Authorization': `Bearer ${token}` } 
 }))
 );
 setTasks(prev => prev.filter(t => !selectedTaskIds.includes(t._id)));
 setSelectedTaskIds([]);
 setShowDeleteConfirm(false);
 toast.success(`${selectedTaskIds.length} tasks deleted`);
 } catch (err) {
 console.error(err);
 toast.error('Failed to delete tasks');
 } finally {
 setIsDeleting(false);
 }
 };

  const filteredTasks = useMemo(() => tasks.filter(task => {
  if (!searchQuery) return true;
  const searchLower = searchQuery.toLowerCase();
  const matchUsername = task.leadId?.username?.toLowerCase().includes(searchLower);
  const matchNotes = task.notes?.toLowerCase().includes(searchLower);
  return matchUsername || matchNotes;
  }), [tasks, searchQuery]);

  const handleVisibleDataChange = useCallback((data) => setVisibleTasks(data), []);

 const tableColumns = [
 {
  label: (
  <Checkbox 
  checked={visibleTasks.length > 0 && visibleTasks.every(t => selectedTaskIds.includes(t._id))}
  onChange={handleSelectAll}
  />
  ),
 className: 'w-10 text-center',
 render: (task) => (
 <div onClick={(e) => e.stopPropagation()}>
 <Checkbox 
 checked={selectedTaskIds.includes(task._id)}
 onChange={() => handleToggleSelectTask(task._id)}
 />
 </div>
 )
 },
 {
 label: 'Lead',
 render: (task) => <span className="font-semibold text-sm text-[var(--color-text-main)]">@{task.leadId?.username || 'Manual'}</span>
 },
 {
 label: 'Type',
 render: (task) => (
 <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
 task.type === 'close' ? 'bg-red-100 text-red-700' :
 task.type === 'demo' ? 'bg-purple-100 text-purple-700' :
 task.type === 'call' ? 'bg-yellow-100 text-yellow-700' :
 'bg-blue-100 text-blue-700'
 }`}>
 {task.type.replace('_', ' ')}
 </span>
 )
 },
 {
 label: 'Priority',
 render: (task) => {
 let variant = 'default';
 if (task.priority === 'high') variant = 'error';
 if (task.priority === 'low') variant = 'info';
 if (task.priority === 'medium') variant = 'warning';
 return <Badge variant={variant}>{task.priority || 'medium'}</Badge>;
 }
 },
 {
 label: 'Notes',
 className: 'max-w-[200px] truncate text-sm',
 render: (task) => <span title={task.notes}>{task.notes || '-'}</span>
 },
 {
 label: 'Due Date',
 render: (task) => {
 const now = new Date().getTime();
 const isOverdue = new Date(task.dueAt).getTime() < now && task.status === 'pending';
 return (
 <span className={`text-sm font-medium ${isOverdue ? 'text-red-500 font-bold' : 'text-[var(--color-text-muted)]'}`}>
 {new Date(task.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
 {isOverdue && ' (Overdue)'}
 </span>
 );
 }
 },
 {
 label: 'Status',
 render: (task) => <Badge variant={task.status === 'completed' ? 'success' : 'default'}>{task.status}</Badge>
 },
 {
 label: 'Actions',
 className: 'text-right',
 render: (task) => (
 <div className="flex items-center gap-2">
 <button
 onClick={() => setEditingTask(task)}
 className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-light)] rounded-md transition-colors border border-transparent hover:border-[var(--color-primary)]"
 >
 <Edit2 size={16} />
 </button>
 </div>
 )
 }
 ];

 return (
 <div className="fade-in space-y-6 max-w-7xl mx-auto py-4">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
 <div>
 <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">Tasks</h1>
 <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage your pending actions and follow-ups.</p>
 </div>
 <div className="flex items-center gap-3">
 <div className={`flex items-center gap-2 transition-opacity duration-200 ${selectedTaskIds.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
 <Button 
 onClick={handleDeleteSelected}
 variant="danger"
 className="text-sm font-semibold py-2 px-3 flex items-center gap-1.5"
 icon={Trash2}
 >
 Delete ({selectedTaskIds.length})
 </Button>
 </div>
 </div>
 </div>

 <div className="w-full space-y-4">
 {/* Filter & Sort Bar */}
 <div className="flex flex-col gap-4">
 
 {/* Top Row: Search and View Mode */}
 <div className="flex items-center justify-between gap-4 w-full">
 {/* Search Input */}
 <div className="relative w-full">
 <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
  <input
  type="text"
  placeholder="Search by username or notes..."
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  className="w-full bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl pl-9 pr-9 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
  />
  {searchQuery && (
    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors" title="Clear search">
      <X size={16} />
    </button>
  )}
 </div>

 {/* View Mode Toggle */}
 <div className="flex shrink-0 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-0.5">
 <button
 onClick={() => setViewMode('grid')}
 className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[var(--color-bg-active)] text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
 title="Tile View"
 >
 <LayoutGrid size={16} />
 </button>
 <button
 onClick={() => setViewMode('table')}
 className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-[var(--color-bg-active)] text-[var(--color-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'}`}
 title="Table View"
 >
 <List size={16} />
 </button>
 </div>
 </div>

 {/* Bottom Row: Sorting and Filters */}
 <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
 {/* Sorting Dropdown */}
 <div className="w-full sm:w-auto">
 <CustomSelect
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value)}
 options={[
 { value: "due_asc", label: "Earliest Due" },
 { value: "due_desc", label: "Latest Due" },
 { value: "priority_desc", label: "Highest Priority" },
 { value: "created_desc", label: "Newest Added" },
 { value: "created_asc", label: "Oldest Added" }
 ]}
 className="w-full sm:w-48 text-sm"
 />
 </div>

 <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end shrink-0">
  
 {/* Date Filter Menu */}
 <div className="relative" ref={dateMenuRef}>
 <button
 onClick={() => setShowDateMenu(!showDateMenu)}
 className={`bg-[var(--color-bg-card)] text-[var(--color-text-main)] border rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${dateFilter ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)]'}`}
 >
 <Calendar size={14} />
 Due Date
 {dateFilter && <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--color-primary)] text-white text-xs">1</span>}
 </button>
 {showDateMenu && (
 <div className="absolute top-full mt-2 right-0 w-56 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 py-3 flex flex-col fade-in">
 <div className="px-4 pb-2">
 <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Due Date</p>
 {[
 { value: '', label: 'All Time' },
 { value: 'today', label: 'Today' },
 { value: 'tomorrow', label: 'Tomorrow' },
 { value: 'upcoming', label: 'Next 7 Days' },
 { value: 'overdue', label: 'Overdue' },
 { value: 'custom', label: 'Custom Range' }
 ].map(opt => (
 <label key={opt.value} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
 <input type="radio" name="dateFilter" checked={dateFilter === opt.value} onChange={() => setDateFilter(opt.value)} className="text-[var(--color-primary)] cursor-pointer" />
 <span className="capitalize text-[var(--color-text-main)]">{opt.label}</span>
 </label>
 ))}

 {dateFilter === 'custom' && (
 <div className="mt-2 space-y-2 fade-in">
 <div className="space-y-1">
 <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Start Date</label>
 <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-primary)]" />
 </div>
 <div className="space-y-1">
 <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">End Date</label>
 <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded px-2 py-1 text-xs focus:outline-none focus:border-[var(--color-primary)]" />
 </div>
 </div>
 )}
 </div>
 </div>
 )}
 </div>

  {/* Admin Assignee Filter */}
  {user?.role === 'admin' && (
  <div className="relative" ref={agentMenuRef}>
  <button
  onClick={() => setShowAgentMenu(!showAgentMenu)}
  className={`bg-[var(--color-bg-card)] text-[var(--color-text-main)] border rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${showAgentMenu || assigneeFilters.length > 0 ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)]'}`}
  >
  <User size={14} />
  Assignee {assigneeFilters.length > 0 && `(${assigneeFilters.length})`}
  </button>
  {showAgentMenu && (
  <div className="absolute top-full mt-2 right-0 w-56 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 py-3 flex flex-col fade-in max-h-[60vh] overflow-y-auto">
  <div className="px-4 py-2">
  <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Filter by Assignee</p>
  
  <label className="flex items-center gap-2 py-1.5 cursor-pointer text-sm border-b border-[var(--color-border-subtle)]/50 pb-2 mb-1">
  <Checkbox 
  checked={assigneeFilters.includes('me')} 
  onChange={() => setAssigneeFilters(prev => prev.includes('me') ? prev.filter(x => x !== 'me') : [...prev, 'me'])} 
  />
  <span className="capitalize text-[var(--color-text-main)] font-semibold truncate">Me (Assigned to Me)</span>
  </label>

  {systemAgents.filter(a => String(a._id) !== String(user?.id || user?._id)).map(agent => (
  <label key={agent._id} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm">
  <Checkbox 
  checked={assigneeFilters.includes(agent._id)} 
  onChange={() => setAssigneeFilters(prev => prev.includes(agent._id) ? prev.filter(x => x !== agent._id) : [...prev, agent._id])} 
  />
  <span className="capitalize text-[var(--color-text-main)] truncate" title={agent.name}>{agent.name}</span>
  </label>
  ))}
  </div>
  </div>
  )}
  </div>
  )}

 {/* Multi-Select Filters */}
 <div className="relative" ref={filterMenuRef}>
 <button
 onClick={() => setShowFilterMenu(!showFilterMenu)}
 className={`bg-[var(--color-bg-card)] text-[var(--color-text-main)] border rounded-xl px-3 py-2.5 text-xs font-semibold flex items-center gap-1.5 transition-colors ${showFilterMenu || statusFilters.length > 0 || priorityFilters.length > 0 || typeFilters.length > 0 ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)]'}`}
 >
 <Filter size={14} />
 Filters {(statusFilters.length + priorityFilters.length + typeFilters.length) > 0 && `(${statusFilters.length + priorityFilters.length + typeFilters.length})`}
 </button>
 {showFilterMenu && (
 <div className="absolute top-full mt-2 right-0 w-56 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 py-3 flex flex-col fade-in max-h-[60vh] overflow-y-auto">
 
 {/* Status */}
 <div className="px-4 py-2">
 <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Status</p>
 {['pending', 'completed'].map(opt => (
 <label key={opt} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
 <Checkbox checked={statusFilters.includes(opt)} onChange={() => setStatusFilters(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])} />
 <span className="capitalize text-[var(--color-text-main)]">{opt}</span>
 </label>
 ))}
 </div>

 <div className="h-px bg-[var(--color-border-subtle)] my-1" />

 {/* Priority */}
 <div className="px-4 py-2">
 <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Priority</p>
 {['high', 'medium', 'low'].map(opt => (
 <label key={opt} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
 <Checkbox checked={priorityFilters.includes(opt)} onChange={() => setPriorityFilters(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])} />
 <span className="capitalize text-[var(--color-text-main)]">{opt}</span>
 </label>
 ))}
 </div>

 <div className="h-px bg-[var(--color-border-subtle)] my-1" />

 {/* Type */}
 <div className="px-4 pt-2">
 <p className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Type</p>
 {['follow_up', 'call', 'demo', 'close'].map(opt => (
 <label key={opt} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
 <Checkbox checked={typeFilters.includes(opt)} onChange={() => setTypeFilters(prev => prev.includes(opt) ? prev.filter(x => x !== opt) : [...prev, opt])} />
 <span className="capitalize text-[var(--color-text-main)]">{opt.replace('_', ' ')}</span>
 </label>
 ))}
 </div>

 {(statusFilters.length > 0 || priorityFilters.length > 0 || typeFilters.length > 0) && (
 <button 
 onClick={() => { setStatusFilters([]); setPriorityFilters([]); setTypeFilters([]); }}
 className="mt-3 pt-3 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] mx-4 text-left font-semibold"
 >
 Clear All
 </button>
 )}
 </div>
 )}
 </div>

  {(dateFilter !== '' || assigneeFilters.length > 0 || statusFilters.length > 0 || priorityFilters.length > 0 || typeFilters.length > 0 || sortBy !== 'due_asc' || searchQuery !== '') && (
    <button
      onClick={() => {
        setSearchQuery('');
        setDateFilter('');
        setAssigneeFilters([]);
        setStatusFilters([]);
        setPriorityFilters([]);
        setTypeFilters([]);
        setSortBy('due_asc');
      }}
      className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors flex items-center gap-1.5 px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)] rounded-xl h-[40px] shrink-0"
    >
      <XCircle size={14} /> Clear Filters
    </button>
  )}
  </div>
  </div>
  </div>

 {/* Tasks List Content */}
 {loading ? (
 <div className="py-20 flex justify-center">
 <Spinner className="text-[var(--color-primary)]" />
 </div>
 ) : filteredTasks.length === 0 ? (
 <div className="card-panel py-20 flex flex-col items-center justify-center text-center bg-[var(--color-bg-card)]">
 <CheckCircle2 size={40} className="text-[var(--color-text-light)] mb-3 opacity-60" />
 <p className="font-semibold text-lg text-[var(--color-text-main)]">All Caught Up!</p>
 <p className="text-sm text-[var(--color-text-muted)] mt-1.5">No scheduled tasks match your filter criteria.</p>
 </div>
 ) : viewMode === 'grid' ? (
 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
 {filteredTasks.map(task => {
 const now = new Date().getTime();
 const isOverdue = new Date(task.dueAt).getTime() < now && task.status === 'pending';
 return (
 <div
 key={task._id}
 className={`card-panel p-5 bg-[var(--color-bg-card)] hover: transition-all flex flex-col justify-between ${
 task.status === 'completed' 
 ? 'opacity-70 bg-[var(--color-bg-subtle)]/30' 
 : isOverdue ? 'border-red-400' : 'border-[var(--color-border-subtle)]'
 }`}
 >
 <div>
 {/* Top Row: Lead handle */}
 <div className="flex items-start gap-3 mb-3 shrink-0">
 <Checkbox 
  checked={selectedTaskIds.includes(task._id)}
  onChange={() => handleToggleSelectTask(task._id)}
  className="mt-1"
  />
 <div className="flex flex-col gap-1.5 min-w-0 flex-1">
 <span className="font-bold text-sm text-[var(--color-text-main)] truncate">
 @{task.leadId?.username || 'Manual Lead'}
 </span>

 <div className="flex items-center gap-1.5 flex-wrap">
 {/* Priority Badge */}
 <span className={`text-xs uppercase font-semibold px-2 py-0.5 rounded tracking-wider ${
 task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200/50' :
 task.priority === 'low' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/50'
 }`}>
 {task.priority || 'medium'}
 </span>

 <span className={`text-xs uppercase font-bold px-2 py-0.5 rounded tracking-wider ${
 task.type === 'close' ? 'bg-red-100 text-red-700' :
 task.type === 'demo' ? 'bg-purple-100 text-purple-700' :
 task.type === 'call' ? 'bg-yellow-100 text-yellow-700' :
 'bg-blue-100 text-blue-700'
 }`}>
 {task.type.replace('_', ' ')}
 </span>
 </div>
 </div>
 </div>

 {/* Notes / description */}
 <p className={`text-sm leading-snug mb-4 font-normal ${
 task.status === 'completed' ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-main)]'
 }`}>
 {task.notes || 'No description provided.'}
 </p>
 </div>

 {/* Bottom Row: Date & Action */}
 <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border-subtle)] shrink-0">
 <div className="flex flex-col">
 <span className={`text-xs font-semibold flex items-center gap-1.5 ${
 isOverdue ? 'text-red-500 font-bold' : 'text-[var(--color-text-muted)]'
 }`}>
 <Calendar size={12} />
 {new Date(task.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
 {isOverdue && ' (Overdue)'}
 </span>
 
 {task.assignedTo && (
 <span className="text-xs text-[var(--color-text-light)] font-medium mt-0.5">
 Agent: {task.assignedTo.name}
 </span>
 )}
 </div>

 <div className="flex items-center gap-1">
 <button
 onClick={() => setEditingTask(task)}
 className="text-[var(--color-text-light)] hover:text-[var(--color-primary)] transition-colors p-1"
 >
 <Edit2 size={16} />
 </button>
 </div>
 </div>
 </div>
 );
 })}
 </div>
  ) : (
  <div className="flex flex-col mb-6">
    {selectedTaskIds.length > 0 && (
      <div className={`border rounded-lg p-3 mb-4 text-center text-sm ${selectedTaskIds.length === filteredTasks.length ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary)]/20' : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border-[var(--color-primary)]/30'}`}>
        {selectedTaskIds.length === filteredTasks.length ? (
          <>
            All <strong>{filteredTasks.length}</strong> tasks in this view are selected.
            <button onClick={() => setSelectedTaskIds([])} className="font-bold hover:underline ml-2 text-[var(--color-primary)]">Clear selection</button>
          </>
        ) : visibleTasks.length > 0 && visibleTasks.every(t => selectedTaskIds.includes(t._id)) ? (
          <>
            All <strong>{visibleTasks.length}</strong> tasks on this page are selected. 
            <button onClick={() => setSelectedTaskIds(filteredTasks.map(t => t._id))} className="font-bold hover:underline ml-2 text-[var(--color-primary)]">
              Select all {filteredTasks.length} tasks in this view
            </button>
          </>
        ) : (
          <>
            <strong>{selectedTaskIds.length}</strong> tasks selected.
            <button onClick={() => setSelectedTaskIds([])} className="font-bold hover:underline ml-2 text-[var(--color-text-muted)]">Clear selection</button>
          </>
        )}
      </div>
    )}
  <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden flex flex-col">
  <Table 
  columns={tableColumns} 
  data={filteredTasks} 
  onVisibleDataChange={handleVisibleDataChange}
  />
  </div>
  </div>
  )}
 </div>

 <Modal
 isOpen={!!editingTask}
 onClose={() => setEditingTask(null)}
 title={
 <span className="flex items-center gap-2">
 <Edit2 size={16} /> Edit Task
 </span>
 }
 footer={
 <>
 <Button variant="secondary" onClick={() => setEditingTask(null)}>Cancel</Button>
 <Button variant="primary" loading={editSaving} onClick={handleUpdateTask} icon={Edit2}>Save Changes</Button>
 </>
 }
 >
 <form id="edit-task-form" className="space-y-4">
 {editError && (
 <div className="bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] p-3 rounded-lg text-xs font-medium">
 {editError}
 </div>
 )}

 <div className="space-y-1.5">
 <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Task Type</label>
 <CustomSelect
 value={editingTask?.type || ''}
 onChange={(e) => setEditingTask({...editingTask, type: e.target.value})}
 options={[
 { value: "follow_up", label: "Follow Up" },
 { value: "call", label: "Phone Call" },
 { value: "demo", label: "Product Demo" },
 { value: "close", label: "Negotiate / Close" }
 ]}
 className="w-full"
 />
 </div>

 <div className="space-y-1.5">
 <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Status</label>
 <div className="flex gap-3">
 {['pending', 'completed'].map(s => (
 <label key={s} className="flex-1 flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-[var(--color-border-subtle)] hover:border-[var(--color-primary)] transition-colors bg-[var(--color-bg-subtle)]">
 <input 
 type="radio" 
 name="editStatus" 
 value={s}
 checked={editingTask?.status === s}
 onChange={() => setEditingTask({...editingTask, status: s})}
 className="text-[var(--color-primary)] cursor-pointer"
 />
 <span className="text-xs font-medium text-[var(--color-text-main)] capitalize">{s}</span>
 </label>
 ))}
 </div>
 </div>

 <Input
 label="Due Date"
 type="date"
 value={editingTask?.dueAt ? new Date(editingTask.dueAt).toISOString().split('T')[0] : ''}
 onChange={(e) => setEditingTask({...editingTask, dueAt: e.target.value})}
 required
 />

 <div className="space-y-1.5">
 <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Priority</label>
 <div className="flex gap-3">
 {['low', 'medium', 'high'].map(p => (
 <label key={p} className="flex-1 flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-[var(--color-border-subtle)] hover:border-[var(--color-primary)] transition-colors bg-[var(--color-bg-subtle)]">
 <input 
 type="radio" 
 name="editPriority" 
 value={p}
 checked={editingTask?.priority === p}
 onChange={() => setEditingTask({...editingTask, priority: p})}
 className="text-[var(--color-primary)] cursor-pointer"
 />
 <span className="text-xs font-medium text-[var(--color-text-main)] capitalize">{p}</span>
 </label>
 ))}
 </div>
 </div>

 <Input
 label="Notes"
 type="textarea"
 value={editingTask?.notes || ''}
 onChange={(e) => setEditingTask({...editingTask, notes: e.target.value})}
 placeholder="Additional context or instructions..."
 />
 </form>
 </Modal>

 <ConfirmationDialog 
 isOpen={showDeleteConfirm}
 onClose={() => setShowDeleteConfirm(false)}
 onConfirm={confirmDelete}
 title="Delete Tasks"
 message={`Are you sure you want to permanently delete ${selectedTaskIds.length} selected tasks? This action cannot be undone.`}
 confirmText="Delete Tasks"
 isLoading={isDeleting}
 />
 </div>
 );
}
