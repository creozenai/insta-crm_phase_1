import { API_URL } from '../config';
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import LeadDetailModal from '../components/leads/LeadDetailModal';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Table from '../components/ui/Table';
import Checkbox from '../components/ui/Checkbox';
import { 
 MessageSquare, 
 MessageCircle, 
 User, 
 Flame, 
 Plus, 
 Search, 
 Filter, 
 ChevronRight, 
 ChevronLeft,
 Users,
 Copy,
 LayoutGrid,
 List,
 Trash2,
 Sparkles,
 Calendar,
 X,
 XCircle
} from 'lucide-react';
import CustomSelect from '../components/ui/CustomSelect';
import ConfirmationDialog from '../components/ui/ConfirmationDialog';
import toast from 'react-hot-toast';

const COLUMNS = [
 { id: 'New', label: 'New Lead', color: 'border-blue-500' },
 { id: 'Not Picking', label: 'Not Picking', color: 'border-yellow-400' },
 { id: 'Contacted', label: 'Contacted', color: 'border-yellow-600' },
 { id: 'Following Up', label: 'Following Up', color: 'border-purple-500' },
 { id: 'Payment Pending', label: 'Payment Pending', color: 'border-orange-500' },
 { id: 'Won', label: 'Won', color: 'border-green-500' },
 { id: 'Lost', label: 'Lost', color: 'border-red-500' },
 { id: 'On Hold', label: 'On Hold', color: 'border-gray-500' },
 { id: 'Future City', label: 'Future City', color: 'border-cyan-500' }
];

export default function LeadsPipeline() {
 const { token, user } = useAuth();
 const draggingRef = useRef(false);
 const [leads, setLeads] = useState([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [priorityFilter, setPriorityFilter] = useState('all');
 const [statusFilters, setStatusFilters] = useState(['New']);
 const [sourceFilter, setSourceFilter] = useState('');
 const [posts, setPosts] = useState([]);
 const [postsWithLeads, setPostsWithLeads] = useState([]);
 const [postFilter, setPostFilter] = useState('');
 const [sortBy, setSortBy] = useState('updated_desc');
 const [assignedToMe, setAssignedToMe] = useState(false);
 const [agentFilter, setAgentFilter] = useState('');
 const [agents, setAgents] = useState([]);
 const [showStatusMenu, setShowStatusMenu] = useState(false);
 const statusMenuRef = useRef(null);
 const [datePreset, setDatePreset] = useState('all');
 const [customStartDate, setCustomStartDate] = useState('');
 const [customEndDate, setCustomEndDate] = useState('');
 const [showDateMenu, setShowDateMenu] = useState(false);
 const dateMenuRef = useRef(null);
 const [selectedLeadId, setSelectedLeadId] = useState(null);
 const [showAddModal, setShowAddModal] = useState(false);
 const [viewMode, setViewMode] = useState(() => {
 return localStorage.getItem('leads_view_mode') || 'list';
 });
 const [draggedOverColumnId, setDraggedOverColumnId] = useState(null);
 const [selectedLeads, setSelectedLeads] = useState([]);
 const [visibleLeads, setVisibleLeads] = useState([]);
 
 // Pagination State
 const [currentPage, setCurrentPage] = useState(1);
 const itemsPerPage = 10;
 
 const handleSetViewMode = (mode) => {
 setViewMode(mode);
 localStorage.setItem('leads_view_mode', mode);
 };
 
 // Manual add form state
 const [newUsername, setNewUsername] = useState('');
 const [newPUserId, setNewPUserId] = useState('');
 const [newPlatform, setNewPlatform] = useState('instagram');
 const [newOtherPlatform, setNewOtherPlatform] = useState('');
 const [newName, setNewName] = useState('');
 const [newEmail, setNewEmail] = useState('');
 const [newPhone, setNewPhone] = useState('');
 const [newCity, setNewCity] = useState('');
 const [newStatus, setNewStatus] = useState('New');
 const [newPriority, setNewPriority] = useState('normal');
 const [newNotes, setNewNotes] = useState('');
 const [newTags, setNewTags] = useState('');
 const [addError, setAddError] = useState(null);

 // Confirmation state
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [isDeleting, setIsDeleting] = useState(false);

 useEffect(() => {
 const handleClickOutside = (event) => {
 if (statusMenuRef.current && !statusMenuRef.current.contains(event.target)) {
 setShowStatusMenu(false);
 }
 if (dateMenuRef.current && !dateMenuRef.current.contains(event.target)) {
 setShowDateMenu(false);
 }
 };
 document.addEventListener('mousedown', handleClickOutside);
 return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 useEffect(() => {
    if (token && user?.role === 'admin') {
      fetch(`${API_URL}/api/leads/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAgents(data); })
      .catch(err => console.error('Failed to fetch agents:', err));
    }
  }, [token, user]);

 useEffect(() => {
    const fetchPosts = async () => {
      let allFetchedPosts = [];
      let afterMedia = null;
      let afterTags = null;
      
      while (afterMedia !== 'done' || afterTags !== 'done') {
        try {
          const params = new URLSearchParams();
          if (afterMedia) params.append('afterMedia', afterMedia);
          if (afterTags) params.append('afterTags', afterTags);
          
          const res = await fetch(`${API_URL}/api/account/posts?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          
          if (data.posts && data.posts.length > 0) {
            allFetchedPosts = [...allFetchedPosts, ...data.posts];
            const uniqueMap = new Map();
            allFetchedPosts.forEach(p => uniqueMap.set(p.id, p));
            const uniquePosts = Array.from(uniqueMap.values());
            uniquePosts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setPosts(uniquePosts);
          }
          
          afterMedia = data.nextMediaCursor;
          afterTags = data.nextTagsCursor;
          
          if (!afterMedia && !afterTags) break;
        } catch (err) {
          console.error("Error fetching batched posts:", err);
          break;
        }
      }

      try {
        const pWLRes = await fetch(`${API_URL}/api/leads/posts-with-leads`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (pWLRes.ok) {
          const pWLData = await pWLRes.json();
          setPostsWithLeads(pWLData);
        }
      } catch (err) {
        console.error("Error fetching posts with leads:", err);
      }
    };
    if (token) fetchPosts();
  }, [token]);

 const fetchLeads = async () => {
 try {
 const params = new URLSearchParams();
 if (priorityFilter && priorityFilter !== 'all') params.append('priority', priorityFilter);
 if (search) params.append('search', search);
 if (statusFilters.length > 0) params.append('status', statusFilters.join(','));
 if (sourceFilter) params.append('source', sourceFilter);
 if (postFilter) params.append('postId', postFilter);
 if (user?.role === 'admin' && agentFilter) {
    params.append('assignedTo', agentFilter);
  } else if (assignedToMe) {
    params.append('assignedToMe', 'true');
  }
 
 if (datePreset !== 'all') {
   const now = new Date();
   let start, end;
   switch (datePreset) {
     case 'today':
       start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
       end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
       break;
     case 'yesterday':
       start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
       end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
       break;
     case 'last_7_days':
       start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
       end = now;
       break;
     case 'last_30_days':
       start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
       end = now;
       break;
     case 'this_month':
       start = new Date(now.getFullYear(), now.getMonth(), 1);
       end = now;
       break;
     case 'last_month':
       start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
       end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
       break;
     case 'custom':
       if (customStartDate) start = new Date(customStartDate);
       if (customEndDate) end = new Date(customEndDate);
       break;
   }
   if (start) params.append('startDate', start.toISOString());
   if (end) params.append('endDate', end.toISOString());
 }
 
 params.append('sort', sortBy);

 const res = await fetch(`${API_URL}/api/leads?${params.toString()}`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const data = await res.json();
 if (res.ok) {
 setLeads(data);
 }
 } catch (err) {
 console.error('Error fetching leads:', err);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 if (token) {
 setCurrentPage(1);
 fetchLeads();
 }
 }, [token, search, priorityFilter, statusFilters, sortBy, sourceFilter, postFilter, assignedToMe, agentFilter, datePreset, customStartDate, customEndDate]);

  const handleUpdateStatus = async (leadId, newStatus) => {
    const leadToUpdate = leads.find(l => l._id === leadId);
    if (!leadToUpdate) return;
    
    if (leadToUpdate.status === 'Won' || leadToUpdate.status === 'Lost' || leadToUpdate.status === 'Rejected') {
      toast.error('Cannot modify a closed lead.');
      return;
    }

    const pipelineOrder = {
      'New': 1, 'Not Picking': 2, 'Contacted': 3, 'Following Up': 4, 'Payment Pending': 5, 'Won': 6, 'Lost': 6,
      'Not Contacted': 2, 'Interested': 5, 'Rejected': 6
    };
    
    const oldIndex = pipelineOrder[leadToUpdate.status] || 0;
    const newIndex = pipelineOrder[newStatus] || 0;
    
    if (oldIndex > 0 && newIndex > 0 && newIndex < oldIndex) {
      toast.error('Lead status progression must move forward.');
      return;
    }

 // Save original state for potential rollback
 const originalLeads = [...leads];

 // Optimistic Update: instantly update the lead's status in local state
 setLeads(prevLeads =>
 prevLeads.map(lead =>
 lead._id === leadId ? { ...lead, status: newStatus } : lead
 )
 );

 try {
 const res = await fetch(`${API_URL}/api/leads/${leadId}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ status: newStatus })
 });
 if (res.ok) {
 // Refetch to sync dynamic properties or order, but without blocking
 fetchLeads();
 } else {
 // Rollback on non-ok response
 setLeads(originalLeads);
 console.error('Failed to update lead status on server');
 }
 } catch (err) {
 console.error('Error updating status:', err);
 // Rollback on network/server error
 setLeads(originalLeads);
 }
 };

 const handleDeleteSelectedLeads = () => {
  setShowDeleteConfirm(true);
  };

 // Drag and Drop handlers
 const onDragStart = (e, leadId) => {
 draggingRef.current = true;
 e.dataTransfer.setData('text/plain', leadId);
 };

 const onDragOver = (e) => {
 e.preventDefault();
 };

 const onDrop = (e, columnId) => {
 setDraggedOverColumnId(null);
 const leadId = e.dataTransfer.getData('text/plain');
 if (leadId) {
 handleUpdateStatus(leadId, columnId);
 }
 };

 const handleCreateLead = async (e) => {
 if (e && e.preventDefault) e.preventDefault();
 setAddError(null);

 try {
 const res = await fetch(`${API_URL}/api/leads`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 username: newUsername.trim() || undefined,
 platformUserId: newPUserId.trim() || undefined,
 platform: newPlatform === 'other' ? newOtherPlatform.trim() : newPlatform,
 name: newName.trim(),
 email: newEmail.trim(),
 phone: newPhone.trim(),
 city: newCity.trim(),
 status: newStatus,
 priority: newPriority,
 notes: newNotes.trim(),
 source: 'manual',
 tags: newTags.split(',').map(t => t.trim()).filter(Boolean)
 })
 });
 const data = await res.json();
 if (res.ok) {
 setShowAddModal(false);
 setNewUsername('');
 setNewPUserId('');
 setNewPlatform('instagram');
 setNewOtherPlatform('');
 setNewName('');
 setNewEmail('');
 setNewPhone('');
 setNewCity('');
 setNewStatus('New');
 setNewPriority('normal');
 setNewNotes('');
 setNewTags('');
 fetchLeads();
 } else {
 setAddError(data.error || 'Failed to create lead');
 }
 } catch (err) {
 console.error('Error creating lead:', err);
 setAddError('Server error creating lead');
 }
 };

 const handleMove = (lead, direction) => {
 const currentIndex = COLUMNS.findIndex(col => col.id === lead.status);
 let newIndex = currentIndex + direction;
 if (newIndex >= 0 && newIndex < COLUMNS.length) {
 handleUpdateStatus(lead._id, COLUMNS[newIndex].id);
 }
 };

 const handleBulkDelete = () => {
 setShowDeleteConfirm(true);
 };

 const confirmDelete = async () => {
 setIsDeleting(true);
 try {
 const res = await fetch(`${API_URL}/api/leads/bulk-delete`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ leadIds: selectedLeads })
 });
 if (res.ok) {
 setSelectedLeads([]);
 fetchLeads();
 setShowDeleteConfirm(false);
 toast.success(`${selectedLeads.length} leads deleted`);
 } else {
 const data = await res.json();
 toast.error(data.error || 'Failed to delete leads');
 }
 } catch (err) {
 console.error('Error deleting leads:', err);
 toast.error('Server error deleting leads');
 } finally {
 setIsDeleting(false);
 }
 };

 // Internal Table component handles pagination in List View

  const handleToggleSelectAll = () => {
    const visibleLeadIds = visibleLeads.map(l => l._id);
    const allVisibleSelected = visibleLeadIds.length > 0 && visibleLeadIds.every(id => selectedLeads.includes(id));
    
    if (allVisibleSelected) {
      // Deselect visible
      setSelectedLeads(prev => prev.filter(id => !visibleLeadIds.includes(id)));
    } else {
      // Select visible
      setSelectedLeads(prev => {
        const newSelection = [...prev];
        for (const id of visibleLeadIds) {
          if (!newSelection.includes(id)) newSelection.push(id);
        }
        return newSelection;
      });
    }
  };

 const handleToggleSelectLead = (id) => {
 setSelectedLeads(prev => 
 prev.includes(id) ? prev.filter(lId => lId !== id) : [...prev, id]
 );
 };

 const tableColumns = [
 {
  label: (
  <Checkbox 
  checked={visibleLeads.length > 0 && visibleLeads.every(l => selectedLeads.includes(l._id))}
  onChange={handleToggleSelectAll}
  />
  ),
 className: 'w-10 text-center',
 render: (lead) => (
 <div onClick={(e) => e.stopPropagation()}>
 <Checkbox 
 checked={selectedLeads.includes(lead._id)}
 onChange={() => handleToggleSelectLead(lead._id)}
 />
 </div>
 )
 },
  {
  label: 'Username',
  render: (lead) => <span className="font-semibold" title={lead.username}>@{lead.username}</span>
  },
  {
  label: 'Name',
  render: (lead) => <span className="text-[var(--color-text-main)] font-medium whitespace-nowrap block">{lead.name || <span className="text-[var(--color-text-light)] italic">-</span>}</span>
  },
 {
 label: 'Status',
 render: (lead) => {
 const column = COLUMNS.find(col => col.id === lead.status);
 let variant = 'default';
 if (lead.status === 'Won') variant = 'success';
 if (lead.status === 'Following Up' || lead.status === 'Interested') variant = 'info';
 if (lead.status === 'Not Contacted') variant = 'warning';
 if (lead.status === 'Rejected') variant = 'error';
 return <Badge variant={variant}>{column?.label || lead.status}</Badge>;
 }
 },
  {
  label: 'Source',
  render: (lead) => (
  <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
  {lead.source === 'dm' ? <MessageCircle size={14} className="text-blue-500" /> : lead.source === 'comment' ? <MessageSquare size={14} className="text-purple-500" /> : <User size={14} className="text-gray-500" />}
  <span className="capitalize">{lead.source}</span>
  </div>
  )
  },
 {
 label: 'Assigned Agent',
 render: (lead) => (
 <span className="text-[var(--color-text-muted)] font-medium">
 {lead.assignedTo?.name || <span className="text-[var(--color-text-light)] font-normal italic">Unassigned</span>}
 </span>
 )
 },
  {
  label: 'Priority',
  render: (lead) => (
  lead.priority === 'super' ? (
  <Badge variant="primary" className="bg-purple-100 text-purple-700 border-purple-200"><Sparkles size={12} className="inline mr-1 -mt-0.5" /> Super</Badge>
  ) : lead.priority === 'hot' ? (
  <Badge variant="error"><Flame size={12} className="inline mr-1 -mt-0.5" /> Hot</Badge>
  ) : (
  <span className="text-[var(--color-text-light)] text-xs font-medium">Normal</span>
  )
  )
  },
  {
  label: 'Date',
  render: (lead) => (
  <div className="flex flex-col text-xs text-[var(--color-text-muted)] whitespace-nowrap">
  <span className="font-semibold text-[var(--color-text-main)]">{new Date(lead.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
  <span>{new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  </div>
  )
  }
 ];

 return (
  <div className={`fade-in space-y-6 flex flex-col ${viewMode === 'board' ? 'h-[calc(100vh-100px)]' : ''}`}>
  {/* Header */}
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
  <div>
  <h1 className="text-xl font-bold text-[var(--color-text-main)] tracking-tight">Leads Pipeline</h1>
  <p className="text-sm text-[var(--color-text-muted)] mt-1">Track and manage your leads through different stages.</p>
  </div>
  <div className="flex items-center gap-3">
  <div className={`flex items-center gap-2 transition-opacity duration-200 ${selectedLeads.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
  <Button 
  onClick={handleBulkDelete}
  variant="danger"
  className="text-sm font-semibold py-2 px-3 flex items-center gap-1.5"
  icon={Trash2}
  >
  Delete ({selectedLeads.length})
  </Button>
  </div>
  <Button onClick={() => setShowAddModal(true)} icon={Plus} className="self-start sm:self-auto whitespace-nowrap">
  Add Lead
  </Button>
  </div>
  </div>

 {/* Top action bar - Row 1 */}
 <div className="flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
 <div className="relative w-full md:max-w-md">
 <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
 <input
 type="text"
 placeholder="Search by name, username, phone, email, tags..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl pl-10 pr-10 py-2.5 focus:outline-none focus:border-[var(--color-primary)] transition-colors text-sm"
 />
 {search && (
   <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]" title="Clear search">
     <X size={16} />
   </button>
 )}
 </div>

 <div className="flex items-center gap-3 shrink-0">
 {/* Agent Filter (Admin) or Assigned to Me Toggle (Agent) */}
 {user?.role === 'admin' ? (
 <CustomSelect
  value={agentFilter}
  onChange={(e) => { setAgentFilter(e.target.value); setAssignedToMe(false); }}
  options={[
    { value: "", label: "All Agents" },
    { value: "me", label: "Assigned to Me" },
    { value: "unassigned", label: "Unassigned" },
    ...agents
      .filter(a => String(a._id) !== String(user?.id || user?._id))
      .map(a => ({ value: a._id, label: `${a.name} (${a.role})` }))
  ]}
 />
 ) : (
 <Button
 onClick={() => setAssignedToMe(!assignedToMe)}
 variant={assignedToMe ? 'primary' : 'outline'}
 className={`text-sm py-2.5 flex items-center gap-1.5 ${!assignedToMe && 'bg-[var(--color-bg-card)]'}`}
 icon={User}
 >
 Assigned to Me
 </Button>
 )}

 {/* View Mode Switcher */}
 <div className="flex items-center border border-[var(--color-border-subtle)] rounded-xl bg-[var(--color-bg-card)] p-0.5 shrink-0">
 <button
 onClick={() => handleSetViewMode('board')}
 className={`p-2 rounded-lg transition-all cursor-pointer ${
 viewMode === 'board'
 ? 'bg-[var(--color-bg-active)] text-[var(--color-primary)]'
 : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
 }`}
 title="Board View"
 >
 <LayoutGrid size={16} />
 </button>
 <button
 onClick={() => handleSetViewMode('list')}
 className={`p-2 rounded-lg transition-all cursor-pointer ${
 viewMode === 'list'
 ? 'bg-[var(--color-bg-active)] text-[var(--color-primary)]'
 : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
 }`}
 title="List View"
 >
 <List size={16} />
 </button>
 </div>
 
 </div>
 </div>

 {/* Top action bar - Row 2 (Filters) */}
 <div className="flex items-center gap-3 flex-wrap shrink-0">
 <CustomSelect
 value={sortBy}
 onChange={(e) => setSortBy(e.target.value)}
 options={[
 { value: "updated_desc", label: "Recently Updated" },
 { value: "newest", label: "Newest First" },
 { value: "oldest", label: "Oldest First" },
 { value: "username_asc", label: "Username (A-Z)" },
 { value: "username_desc", label: "Username (Z-A)" }
 ]}
 />

 <CustomSelect
 value={sourceFilter}
 onChange={(e) => setSourceFilter(e.target.value)}
 options={[
 { value: "", label: "All Sources" },
 { value: "dm", label: "Direct Messages" },
 { value: "comment", label: "Comments" },
 { value: "manual", label: "Manual" },
 { value: "other", label: "Other" }
 ]}
 />

 <CustomSelect
 value={postFilter}
 onChange={(e) => setPostFilter(e.target.value)}
 className="min-w-[250px] sm:w-[250px] md:w-[250px]"
 options={[
 { value: "", label: "All Posts" },
 ...posts
 .filter(p => postsWithLeads.includes(p.id))
 .map(p => {
   const postDate = p.timestamp ? new Date(p.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '';
   const captionText = p.caption ? (p.caption.length > 30 ? p.caption.substring(0, 30) + '...' : p.caption) : 'Post ' + p.id;
   return {
     value: p.id, 
     displayLabel: captionText,
     label: postDate ? (
       <div className="flex flex-col text-left py-0.5">
         <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-wider leading-none mb-1">{postDate}</span>
         <span className="truncate">{captionText}</span>
       </div>
     ) : captionText
   };
 })
 ]}
 />

 <div className="relative shrink-0" ref={dateMenuRef}>
   <button
     onClick={() => setShowDateMenu(!showDateMenu)}
     className={`bg-[var(--color-bg-card)] text-[var(--color-text-main)] border rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors ${showDateMenu || datePreset !== 'all' ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--color-border-subtle)]'}`}
   >
     <Calendar size={16} />
     {datePreset === 'all' ? 'All Time' : 
      datePreset === 'today' ? 'Today' :
      datePreset === 'yesterday' ? 'Yesterday' :
      datePreset === 'last_7_days' ? 'Last 7 Days' :
      datePreset === 'last_30_days' ? 'Last 30 Days' :
      datePreset === 'this_month' ? 'This Month' :
      datePreset === 'last_month' ? 'Last Month' : 'Custom Range'
     }
   </button>
   {showDateMenu && (
     <div className="absolute top-full mt-2 left-0 w-64 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 py-2 flex flex-col fade-in shadow-xl">
       {['all', 'today', 'yesterday', 'last_7_days', 'last_30_days', 'this_month', 'last_month', 'custom'].map(preset => (
         <label key={preset} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer text-sm">
           <input
             type="radio"
             name="date_preset"
             checked={datePreset === preset}
             onChange={() => setDatePreset(preset)}
             className="accent-[var(--color-primary)]"
           />
           {preset === 'all' ? 'All Time' : 
            preset === 'today' ? 'Today' :
            preset === 'yesterday' ? 'Yesterday' :
            preset === 'last_7_days' ? 'Last 7 Days' :
            preset === 'last_30_days' ? 'Last 30 Days' :
            preset === 'this_month' ? 'This Month' :
            preset === 'last_month' ? 'Last Month' : 'Custom Date & Time'}
         </label>
       ))}
       {datePreset === 'custom' && (
         <div className="px-4 py-3 mt-2 border-t border-[var(--color-border-subtle)] flex flex-col gap-3">
           <div>
             <label className="text-xs text-[var(--color-text-muted)] font-semibold mb-1 block">Start Date & Time</label>
             <input 
               type="datetime-local" 
               value={customStartDate} 
               onChange={(e) => setCustomStartDate(e.target.value)} 
               className="w-full bg-[var(--color-bg-hover)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[var(--color-primary)]"
             />
           </div>
           <div>
             <label className="text-xs text-[var(--color-text-muted)] font-semibold mb-1 block">End Date & Time</label>
             <input 
               type="datetime-local" 
               value={customEndDate} 
               onChange={(e) => setCustomEndDate(e.target.value)} 
               className="w-full bg-[var(--color-bg-hover)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-[var(--color-primary)]"
             />
           </div>
         </div>
       )}
     </div>
   )}
 </div>

 <div className="relative shrink-0" ref={statusMenuRef}>
 <button
 onClick={() => setShowStatusMenu(!showStatusMenu)}
 className={`bg-[var(--color-bg-card)] text-[var(--color-text-main)] border rounded-xl px-4 py-2.5 text-sm font-semibold flex items-center gap-2 transition-colors ${showStatusMenu || statusFilters.length > 0 ? 'border-[var(--color-primary)] text-[var(--color-primary)]' : 'border-[var(--color-border-subtle)]'}`}
 >
 <Filter size={16} />
 {statusFilters.length === 0 ? 'All Statuses' : `Statuses (${statusFilters.length})`}
 </button>
 {showStatusMenu && (
 <div className="absolute top-full mt-2 left-0 w-48 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 py-2 flex flex-col fade-in">
 {COLUMNS.map(col => (
 <label key={col.id} className="flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-bg-hover)] cursor-pointer text-sm">
 <input
 type="checkbox"
 checked={statusFilters.includes(col.id)}
 onChange={() => {
 setStatusFilters(prev => 
 prev.includes(col.id) 
 ? prev.filter(s => s !== col.id)
 : [...prev, col.id]
 );
 }}
 className="pro-checkbox"
 />
 {col.label}
 </label>
 ))}
 {statusFilters.length > 0 && (
 <button 
 onClick={() => setStatusFilters([])}
 className="mt-2 pt-2 border-t border-[var(--color-border-subtle)] text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] mx-4 text-left font-semibold"
 >
 Clear All
 </button>
 )}
 </div>
 )}
 </div>

        <CustomSelect
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          options={[
            { value: "all", label: "All Priorities" },
            { value: "super", label: <span className="flex items-center gap-1.5"><Sparkles size={14} className="text-purple-600" /> Super Leads</span> },
            { value: "hot", label: <span className="flex items-center gap-1.5"><Flame size={14} className="text-[var(--color-status-error)]" /> Hot Leads</span> },
            { value: "normal", label: <span className="flex items-center gap-1.5"><User size={14} className="text-[var(--color-text-muted)]" /> Normal Leads</span> }
          ]}
        />
        {(statusFilters.length > 0 || priorityFilter !== 'all' || sourceFilter !== '' || postFilter !== '' || datePreset !== 'all' || sortBy !== 'updated_desc' || search !== '' || agentFilter !== '') && (
          <button
            onClick={() => {
              setSearch('');
              setStatusFilters([]);
              setPriorityFilter('all');
              setSourceFilter('');
              setPostFilter('');
              setDatePreset('all');
              setCustomStartDate('');
              setCustomEndDate('');
              setSortBy('updated_desc');
              setAgentFilter('');
              setAssignedToMe(false);
            }}
            className="text-xs font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors flex items-center gap-1.5 px-3 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)] rounded-xl h-[42px]"
          >
            <XCircle size={14} /> Clear Filters
          </button>
        )}
 </div>

 {/* Content Area */}
 {loading ? (
 <div className="flex-1 flex items-center justify-center">
 <Spinner className="text-[var(--color-primary)]" />
 </div>
  ) : viewMode === 'list' ? (
  <div className="flex flex-col mb-6">
    {selectedLeads.length > 0 && (
      <div className={`border rounded-lg p-3 mb-4 text-center text-sm ${selectedLeads.length === leads.length ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] border-[var(--color-primary)]/20' : 'bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border-[var(--color-primary)]/30'}`}>
        {selectedLeads.length === leads.length ? (
          <>
            All <strong>{leads.length}</strong> leads in this view are selected.
            <button onClick={() => setSelectedLeads([])} className="font-bold hover:underline ml-2 text-[var(--color-primary)]">Clear selection</button>
          </>
        ) : visibleLeads.length > 0 && visibleLeads.every(l => selectedLeads.includes(l._id)) ? (
          <>
            All <strong>{visibleLeads.length}</strong> leads on this page are selected. 
            <button onClick={() => setSelectedLeads(leads.map(l => l._id))} className="font-bold hover:underline ml-2 text-[var(--color-primary)]">
              Select all {leads.length} leads in this view
            </button>
          </>
        ) : (
          <>
            <strong>{selectedLeads.length}</strong> leads selected.
            <button onClick={() => setSelectedLeads([])} className="font-bold hover:underline ml-2 text-[var(--color-text-muted)]">Clear selection</button>
          </>
        )}
      </div>
    )}
  <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl overflow-hidden flex flex-col">
  <Table 
  columns={tableColumns} 
  data={leads} 
  itemsPerPage={10} 
  currentPage={currentPage}
  onPageChange={setCurrentPage}
  onRowClick={(lead) => setSelectedLeadId(lead._id)}
  onVisibleDataChange={(data) => setVisibleLeads(data)}
  />
  </div>
  </div>
  ) : (
 <div className="flex-1 flex gap-4 overflow-x-auto pb-4 scroll-smooth min-h-0">
 {COLUMNS.map(column => {
 const columnLeads = leads.filter(l => l.status === column.id);
 const isHovered = draggedOverColumnId === column.id;
 return (
 <div 
 key={column.id}
 onDragOver={onDragOver}
 onDrop={(e) => onDrop(e, column.id)}
 onDragEnter={(e) => { e.preventDefault(); setDraggedOverColumnId(column.id); }}
 onDragLeave={() => setDraggedOverColumnId(null)}
 className={`w-[290px] rounded-2xl flex flex-col shrink-0 overflow-hidden transition-all duration-300 border shadow-sm ${
 isHovered
 ? `border-[var(--color-primary)]/40 bg-[var(--color-bg-active)] shadow-md ring-4 ring-[var(--color-primary)]/10`
 : 'bg-[var(--color-bg-subtle)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-focus)]'
 }`}
 >
 {/* Header */}
 <div className="p-4 flex items-center justify-between shrink-0 bg-[var(--color-bg-card)] border-b border-[var(--color-border-subtle)]/60">
 <span className="font-bold text-xs text-[var(--color-text-main)] uppercase tracking-wider">{column.label}</span>
 <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] border border-[var(--color-primary)]/20 shadow-sm">
 {columnLeads.length}
 </span>
 </div>

 {/* Cards List */}
 <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3">
 {columnLeads.length === 0 ? (
 <div className="text-center py-10 text-xs text-[var(--color-text-muted)] font-medium">
 Drag leads here
 </div>
 ) : (
 columnLeads.map(lead => (
 <div
 key={lead._id}
 draggable
 onDragStart={(e) => onDragStart(e, lead._id)}
 onDragEnd={() => {
 // Add small delay to prevent click fire right after drag end
 setTimeout(() => { draggingRef.current = false; }, 100);
 setDraggedOverColumnId(null);
 }}
 onClick={() => {
 if (!draggingRef.current) {
 setSelectedLeadId(lead._id);
 }
 }}
 className="p-4 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] hover:border-[var(--color-primary)]/40 rounded-xl cursor-pointer transition-all duration-300 select-none flex flex-col gap-3 active:scale-[0.98] group relative shadow-sm hover:shadow-md"
 >
 {/* Title & Checkbox */}
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2 max-w-[80%]">
 <Checkbox 
 checked={selectedLeads.includes(lead._id)}
 onChange={() => handleToggleSelectLead(lead._id)}
 onClick={(e) => e.stopPropagation()}
 />
 <span className="font-semibold text-base text-[var(--color-text-main)] truncate">
 @{lead.username}
 </span>
 </div>
  {lead.priority === 'super' ? (
  <Sparkles size={15} className="text-purple-600 fill-purple-600 shrink-0" />
  ) : lead.priority === 'hot' ? (
  <Flame size={15} className="text-[var(--color-status-error)] fill-[var(--color-status-error)] shrink-0" />
  ) : null}
 </div>

 {/* Agent / Tags */}
 {lead.assignedTo && (
 <div className="text-xs text-[var(--color-text-muted)] font-medium">
 Agent: <span className="text-[var(--color-text-main)]">{lead.assignedTo.name}</span>
 </div>
 )}

 {lead.tags && lead.tags.length > 0 && (
 <div className="flex flex-wrap gap-1.5 mt-1">
 {lead.tags.slice(0, 3).map((t, idx) => (
 <span key={idx} className="text-[11px] bg-[var(--color-bg-active)] text-[var(--color-text-main)] px-2 py-0.5 rounded-md font-semibold border border-[var(--color-border-subtle)]">
 {t}
 </span>
 ))}
 {lead.tags.length > 3 && (
 <span className="text-[11px] bg-[var(--color-bg-active)] text-[var(--color-text-muted)] px-2 py-0.5 rounded-md font-bold border border-[var(--color-border-subtle)]">
 +{lead.tags.length - 3}
 </span>
 )}
 </div>
 )}

 {/* Bottom Info Row */}
 <div className="flex items-center justify-between pt-1 border-t border-[var(--color-border-subtle)]/50 shrink-0">
 <div className="flex items-center gap-1.5 text-[var(--color-text-muted)]">
 {lead.source === 'dm' ? (
 <MessageCircle size={13} className="text-blue-500" />
 ) : lead.source === 'comment' ? (
 <MessageSquare size={13} className="text-purple-500" />
 ) : (
 <User size={13} className="text-gray-500" />
 )}
 <div className="flex flex-col">
   <span className="text-xs font-medium capitalize leading-tight">{lead.source}</span>
   <span className="text-[9px] uppercase font-bold text-[var(--color-text-light)] leading-tight tracking-wider">{lead.platform || 'Other'}</span>
 </div>
 </div>
 
 {/* Quick navigation arrows for mobile/tablets */}
 <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity duration-200">
 <button
 onClick={(e) => { e.stopPropagation(); handleMove(lead, -1); }}
 disabled={column.id === 'new'}
 className="p-1 hover:bg-[var(--color-bg-active)] rounded text-[var(--color-text-muted)] disabled:opacity-30 disabled:hover:bg-transparent"
 >
 <ChevronLeft size={13} />
 </button>
 <button
 onClick={(e) => { e.stopPropagation(); handleMove(lead, 1); }}
 disabled={column.id === 'lost'}
 className="p-1 hover:bg-[var(--color-bg-active)] rounded text-[var(--color-text-muted)] disabled:opacity-30 disabled:hover:bg-transparent"
 >
 <ChevronRight size={13} />
 </button>
 </div>
 </div>
 </div>
 ))
 )}
 </div>
 </div>
 );
 })}
 </div>
 )}

 {/* Lead details Modal */}
 {selectedLeadId && (
 <LeadDetailModal
 leadId={selectedLeadId}
 onClose={() => { setSelectedLeadId(null); fetchLeads(); }}
 />
 )}

 <Modal
 isOpen={showAddModal}
 onClose={() => setShowAddModal(false)}
 title="Add Manual CRM Lead"
 footer={
 <>
 <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
 <Button variant="primary" onClick={(e) => handleCreateLead(e)}>Save Lead</Button>
 </>
 }
 >
 {addError && (
 <div className="bg-[var(--color-status-error-bg)] text-[var(--color-status-error)] p-3 rounded-lg text-sm mb-4 font-medium">
 {addError}
 </div>
 )}

 <form id="add-lead-form" onSubmit={handleCreateLead} className="space-y-4">
  <Input
    label="Full Name"
    placeholder="e.g. Jane Smith"
    value={newName}
    onChange={(e) => setNewName(e.target.value)}
  />

  <div className="grid grid-cols-2 gap-4">
    <Input
      label="Email Address"
      type="email"
      placeholder="e.g. jane@example.com"
      value={newEmail}
      onChange={(e) => setNewEmail(e.target.value)}
    />
    <Input
      label="Phone Number"
      placeholder="e.g. +1 555-0123"
      value={newPhone}
      onChange={(e) => setNewPhone(e.target.value)}
    />
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Platform</label>
      <CustomSelect
        value={newPlatform}
        onChange={(e) => setNewPlatform(e.target.value)}
        options={[
          { value: "instagram", label: "Instagram" },
          { value: "facebook", label: "Facebook" },
          { value: "youtube", label: "YouTube" },
          { value: "linkedin", label: "LinkedIn" },
          { value: "other", label: "Other" }
        ]}
      />
    </div>
    <Input
      label="Platform-Specific Username"
      placeholder="e.g. janesmith (without @)"
      value={newUsername}
      onChange={(e) => setNewUsername(e.target.value)}
    />
  </div>

  {newPlatform === 'other' && (
    <Input
      label="Specify Platform"
      placeholder="e.g. TikTok"
      value={newOtherPlatform}
      onChange={(e) => setNewOtherPlatform(e.target.value)}
    />
  )}

  <div className="grid grid-cols-2 gap-4">
    <Input
      label="Platform ID (Optional)"
      placeholder="e.g. 178414058..."
      value={newPUserId}
      onChange={(e) => setNewPUserId(e.target.value)}
    />
    <Input
      label="City"
      placeholder="e.g. Mumbai, NY"
      value={newCity}
      onChange={(e) => setNewCity(e.target.value)}
    />
  </div>

  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="block text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">Status</label>
      <CustomSelect
        value={newStatus}
        onChange={(e) => setNewStatus(e.target.value)}
        options={[
          { value: "New", label: "New" },
          { value: "Not Picking", label: "Not Picking" },
          { value: "Contacted", label: "Contacted" },
          { value: "Following Up", label: "Following Up" },
          { value: "Payment Pending", label: "Payment Pending" },
          { value: "Won", label: "Won" },
          { value: "Lost", label: "Lost" },
          { value: "On Hold", label: "On Hold" },
          { value: "Future City", label: "Future City" }
        ]}
      />
    </div>
    <div className="flex items-center justify-between mt-6 px-2">
      <span className="text-sm font-semibold text-[var(--color-text-muted)] flex items-center gap-1.5">
        <Sparkles size={16} className={newPriority === 'super' ? 'text-purple-600 fill-purple-600' : ''} />
        Super Lead
      </span>
      <label className="pro-toggle">
        <input type="checkbox" className="pro-checkbox" checked={newPriority === 'super'} onChange={(e) => setNewPriority(e.target.checked ? 'super' : 'normal')} />
        <span className="pro-toggle-track"></span>
      </label>
    </div>
  </div>

 <Input
 label="Tags (Comma-separated)"
 placeholder="e.g. collab, hot, retail"
 value={newTags}
 onChange={(e) => setNewTags(e.target.value)}
 />

 <Input
 type="textarea"
 label="Lead Notes"
 placeholder="Add details about this prospect..."
 value={newNotes}
 onChange={(e) => setNewNotes(e.target.value)}
 rows={3}
 />
 </form>
 </Modal>

 <ConfirmationDialog 
 isOpen={showDeleteConfirm}
 onClose={() => setShowDeleteConfirm(false)}
 onConfirm={confirmDelete}
 title="Delete Leads"
 message={`Are you sure you want to permanently delete ${selectedLeads.length} selected leads and their history? This action cannot be undone.`}
 confirmText="Delete Leads"
 isLoading={isDeleting}
 />
 </div>
 );
}
