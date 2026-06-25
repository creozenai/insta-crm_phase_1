import { API_URL } from '../../config';
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../ui/Spinner';
import { 
 X, 
 Flame, 
 Tag, 
 Clipboard, 
 MessageSquare, 
 MessageCircle, 
 Calendar, 
 Plus, 
 CheckSquare, 
 Square,
 Trash2,
 Send,
 FileText,
 Copy,
 LayoutGrid,
 Sparkles,
 Eye
} from 'lucide-react';
import CustomSelect from '../ui/CustomSelect';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import toast from 'react-hot-toast';

export default function LeadDetailModal({ leadId, onClose }) {
 const { token, user } = useAuth();
 
 // Data State
 const [lead, setLead] = useState(null);
 const [timeline, setTimeline] = useState([]);
 const [agents, setAgents] = useState([]);
 const [tasks, setTasks] = useState([]);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);

 // Message fields
 const [replyText, setReplyText] = useState('');
 const [sendingMessage, setSendingMessage] = useState(false);
 const [templates, setTemplates] = useState([]);
 const [showTemplatesPopover, setShowTemplatesPopover] = useState(false);
 const timelineEndRef = React.useRef(null);

 // Edit fields
 const [status, setStatus] = useState('new');
 const [priority, setPriority] = useState('normal');
 const [assignedTo, setAssignedTo] = useState('');
 const [notes, setNotes] = useState('');
 const [tags, setTags] = useState([]);
 const [tagInput, setTagInput] = useState('');
 const [name, setName] = useState('');
 const [email, setEmail] = useState('');
 const [phone, setPhone] = useState('');
 const [city, setCity] = useState('');
 const [platform, setPlatform] = useState('other');
 const [otherPlatform, setOtherPlatform] = useState('');
 const [username, setUsername] = useState('');

 // Task creation state
 const [taskType, setTaskType] = useState('follow_up');
 const [taskDue, setTaskDue] = useState('');
 const [taskNotes, setTaskNotes] = useState('');
 const [taskPriority, setTaskPriority] = useState('medium');
 const [taskAssignedTo, setTaskAssignedTo] = useState('');
 const [addingTask, setAddingTask] = useState(false);

 // Confirmation state
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [taskToDelete, setTaskToDelete] = useState(null);
 const [isDeletingTask, setIsDeletingTask] = useState(false);

 const scrollToBottom = () => {
 timelineEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 };

 useEffect(() => {
 scrollToBottom();
 }, [timeline]);

 useEffect(() => {
 if (token) {
 fetch(`${API_URL}/api/rules-templates/templates`, {
 headers: { 'Authorization': `Bearer ${token}` }
 })
 .then(res => res.json())
 .then(data => {
 if (Array.isArray(data)) {
 setTemplates(data);
 }
 })
 .catch(err => console.error('Failed to fetch templates:', err));
 }
 }, [token]);

 useEffect(() => {
 const fetchData = async () => {
 setLoading(true);
 try {
 // Fetch single lead details
 const leadRes = await fetch(`${API_URL}/api/leads/${leadId}`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const leadData = await leadRes.json();
 
 // Fetch timeline details
 const timelineRes = await fetch(`${API_URL}/api/leads/${leadId}/timeline`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const timelineData = await timelineRes.json();

 // Fetch agents
 const agentsRes = await fetch(`${API_URL}/api/leads/agents`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const agentsData = await agentsRes.json();

 // Fetch tasks for this lead
 const tasksRes = await fetch(`${API_URL}/api/tasks?leadId=${leadId}`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 const tasksData = await tasksRes.json();

 if (leadRes.ok) {
 setLead(leadData);
 setStatus(leadData.status);
 setPriority(leadData.priority || 'normal');
 setAssignedTo(leadData.assignedTo?._id || leadData.assignedTo || '');
 setNotes(leadData.notes || '');
 setTags(leadData.tags || []);
 setName(leadData.name || '');
 setEmail(leadData.email || '');
 setPhone(leadData.phone || '');
 setCity(leadData.city || '');
 const p = leadData.platform || 'other';
 if (['instagram', 'facebook', 'youtube', 'linkedin', 'other'].includes(p)) {
   setPlatform(p);
   setOtherPlatform('');
 } else {
   setPlatform('other');
   setOtherPlatform(p);
 }
 setUsername(leadData.username || '');
 }

 if (timelineRes.ok) {
 setTimeline(timelineData.timeline);
 }

 if (agentsRes.ok) {
 setAgents(agentsData);
 }

 if (tasksRes.ok) {
 setTasks(tasksData);
 }
 } catch (err) {
 console.error(err);
 } finally {
 setLoading(false);
 }
 };

 if (token && leadId) {
 fetchData();
 }
 }, [token, leadId]);

 // Handle saving details
 const handleSaveDetails = async () => {
 setSaving(true);
 try {
 const res = await fetch(`${API_URL}/api/leads/${leadId}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 status,
 priority,
 assignedTo: assignedTo || null,
 notes,
 tags,
 name,
 email,
 phone,
 city,
 platform: platform === 'other' ? otherPlatform.trim() : platform,
 username
 })
 });
 if (res.ok) {
 toast.success('Lead details saved successfully!');
 }
 } catch (err) {
 console.error(err);
 } finally {
 setSaving(false);
 }
 };

 // Tag helpers
 const handleAddTag = (e) => {
 if (e.key === 'Enter' && tagInput.trim()) {
 e.preventDefault();
 if (!tags.includes(tagInput.trim())) {
 setTags([...tags, tagInput.trim()]);
 }
 setTagInput('');
 }
 };

 const handleRemoveTag = (tagToRemove) => {
 setTags(tags.filter(t => t !== tagToRemove));
 };

 // Message helpers
 const handleSendMessage = async () => {
 if (!replyText.trim() || !lead?.platformUserId) return;
 setSendingMessage(true);
 try {
 const res = await fetch(`${API_URL}/api/messages/send`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ recipientId: lead.platformUserId, text: replyText })
 });
 if (res.ok) {
 setReplyText('');
 // fetch timeline again to update UI
 const timelineRes = await fetch(`${API_URL}/api/leads/${leadId}/timeline`, {
 headers: { 'Authorization': `Bearer ${token}` }
 });
 if (timelineRes.ok) {
 const timelineData = await timelineRes.json();
 setTimeline(timelineData.timeline);
 }
 } else {
 const data = await res.json();
 toast.error(`Failed to send message: ${data.error || 'Unknown error'}`);
 }
 } catch (err) {
 console.error(err);
 } finally {
 setSendingMessage(false);
 }
 };

 // Task helpers
 const handleAddTask = async (e) => {
 e.preventDefault();
 if (!taskDue) return;
 setAddingTask(true);

 try {
 const res = await fetch(`${API_URL}/api/tasks`, {
 method: 'POST',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({
 leadId,
 assignedTo: taskAssignedTo === 'unassigned' ? null : (taskAssignedTo || assignedTo || null),
 type: taskType,
 dueAt: taskDue,
 notes: taskNotes,
 priority: taskPriority
 })
 });
 const data = await res.json();
 if (res.ok) {
 setTasks([...tasks, data]);
 setTaskDue('');
 setTaskNotes('');
 setTaskType('follow_up');
 setTaskPriority('medium');
 }
 } catch (err) {
 console.error(err);
 } finally {
 setAddingTask(false);
 }
 };

 const handleToggleTask = async (task) => {
 const nextStatus = task.status === 'pending' ? 'completed' : 'pending';
 
 // Save original state for potential rollback
 const originalTasks = [...tasks];

 // Optimistic Update: instantly update task status locally
 setTasks(prevTasks =>
 prevTasks.map(t => t._id === task._id ? { ...t, status: nextStatus, completedAt: nextStatus === 'completed' ? new Date() : null } : t)
 );

 try {
 const res = await fetch(`${API_URL}/api/tasks/${task._id}`, {
 method: 'PUT',
 headers: {
 'Content-Type': 'application/json',
 'Authorization': `Bearer ${token}`
 },
 body: JSON.stringify({ status: nextStatus })
 });
 const data = await res.json();
 if (res.ok) {
 setTasks(prevTasks => prevTasks.map(t => t._id === task._id ? data : t));
 } else {
 // Rollback
 setTasks(originalTasks);
 console.error('Failed to toggle task on server');
 }
 } catch (err) {
 console.error(err);
 // Rollback
 setTasks(originalTasks);
 }
 };

 const handleDeleteTask = (taskId) => {
 setTaskToDelete(taskId);
 setShowDeleteConfirm(true);
 };

 const confirmDeleteTask = async () => {
 if (!taskToDelete) return;
 setIsDeletingTask(true);
 try {
 const res = await fetch(`${API_URL}/api/tasks/${taskToDelete}`, {
 method: 'DELETE',
 headers: { 'Authorization': `Bearer ${token}` }
 });
 if (res.ok) {
 setTasks(tasks.filter(t => t._id !== taskToDelete));
 setShowDeleteConfirm(false);
 setTaskToDelete(null);
 toast.success('Task deleted');
 } else {
 toast.error('Failed to delete task');
 }
 } catch (err) {
 console.error(err);
 toast.error('Server error deleting task');
 } finally {
 setIsDeletingTask(false);
 }
 };

 if (loading) {
 return createPortal(
 <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
 <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl p-10">
 <Spinner className="text-[var(--color-primary)]" />
 </div>
 </div>,
 document.body
 );
 }

 return createPortal(
 <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 fade-in" onClick={onClose}>
 {/* Container */}
 <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] w-full max-w-[1200px] h-full max-h-[85vh] flex flex-col rounded-xl overflow-hidden relative slide-up" onClick={(e) => e.stopPropagation()}>
 {/* Header */}
 <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between bg-[var(--color-bg-subtle)] shrink-0">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-full bg-[var(--color-border-subtle)] flex items-center justify-center overflow-hidden">
 {lead?.profilePicUrl ? (
 <img src={lead.profilePicUrl} alt={lead.username} className="w-full h-full object-cover" />
 ) : (
 <span className="font-bold text-sm text-[var(--color-text-muted)]">
 {lead?.username.slice(0, 2).toUpperCase()}
 </span>
 )}
 </div>
 <div>
 <h3 className="font-bold text-base text-[var(--color-text-main)] flex items-center gap-2">
 @{lead?.username}
 {priority === 'super' ? (
    <Sparkles size={16} className="text-purple-600 fill-purple-600" />
  ) : priority === 'hot' ? (
    <Flame size={16} className="text-[var(--color-status-error)] fill-[var(--color-status-error)]" />
  ) : null}
 </h3>
 <p className="text-xs text-[var(--color-text-muted)] uppercase font-semibold tracking-wide">
 Source: {lead?.source}
 </p>
 </div>
 </div>
 <button onClick={onClose} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors">
 <X size={24} />
 </button>
 </div>

 {/* Modal content body */}
 <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden">
 {/* Left panel: Info Form */}
 <div className="w-full md:w-[350px] p-6 border-b md:border-b-0 md:border-r border-[var(--color-border-subtle)] flex flex-col gap-5 overflow-y-auto shrink-0 bg-[var(--color-bg-card)]">
 <h4 className="font-bold text-sm text-[var(--color-text-main)] border-b border-[var(--color-border-subtle)] pb-2 uppercase tracking-wide">Lead Information</h4>

 {/* Priority toggle */}
 {priority !== 'hot' && (
   <div className="flex items-center justify-between">
     <span className="text-sm font-semibold text-[var(--color-text-muted)] flex items-center gap-1.5">
       <Sparkles size={16} className={priority === 'super' ? 'text-purple-600 fill-purple-600' : ''} />
       Super Lead
     </span>
     <label className="pro-toggle">
       <input type="checkbox" className="pro-checkbox" checked={priority === 'super'} onChange={(e) => setPriority(e.target.checked ? 'super' : 'normal')} />
       <span className="pro-toggle-track"></span>
     </label>
   </div>
 )}

 {/* Basic Info Fields */}
 <div className="space-y-3 pt-2 border-t border-[var(--color-border-subtle)]">
 <div className="space-y-1.5">
 <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Username</label>
 <input
 type="text"
 value={username}
 onChange={(e) => setUsername(e.target.value)}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
 />
 </div>

 {/* Assigned to agent select */}
 {user?.role === 'admin' && (
 <div className="space-y-1.5">
 <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Assigned Agent</label>
 <CustomSelect
 value={assignedTo}
 onChange={(e) => setAssignedTo(e.target.value)}
 options={[
 { value: "", label: "Unassigned" },
 ...(user ? [{ value: user.id || user._id, label: "Assign to Me" }] : []),
 ...agents
 .filter(a => String(a._id) !== String(user?.id || user?._id))
 .map(a => ({ value: a._id, label: `${a.name} (${a.role})` }))
 ]}
 className="w-full"
 />
 </div>
 )}
 <div className="space-y-1.5">
 <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Name</label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
 />
 </div>
 <div className="space-y-1.5">
 <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Email</label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
 />
 </div>
 <div className="space-y-1.5">
 <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Phone</label>
 <input
 type="text"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
 />
 </div>
 <div className="space-y-1.5">
 <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">City</label>
 <input
 type="text"
 value={city}
 onChange={(e) => setCity(e.target.value)}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-primary)] transition-colors"
 />
 </div>
 <div className="space-y-1.5">
 <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Platform</label>
 <CustomSelect
 value={platform}
 onChange={(e) => setPlatform(e.target.value)}
 options={[
 { value: "instagram", label: "Instagram" },
 { value: "facebook", label: "Facebook" },
 { value: "youtube", label: "YouTube" },
 { value: "linkedin", label: "LinkedIn" },
 { value: "other", label: "Other" }
 ]}
 className="w-full"
 />
 </div>
 </div>

 {/* Status select */}
 <div className="space-y-1.5">
 <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Pipeline Stage</label>
 <CustomSelect
 value={status}
 onChange={(e) => setStatus(e.target.value)}
 options={[
 { value: "new", label: "New Lead" },
 { value: "contacted", label: "Contacted" },
 { value: "qualified", label: "Qualified" },
 { value: "converted", label: "Converted" },
 { value: "lost", label: "Lost" }
 ]}
 className="w-full"
 />
 </div>


 {/* Tags input */}
 <div className="space-y-2">
 <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
 <Tag size={13} /> Tags (Press Enter)
 </label>
 <input
 type="text"
 placeholder="Add tags..."
 value={tagInput}
 onChange={(e) => setTagInput(e.target.value)}
 onKeyDown={handleAddTag}
 className="w-full bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] text-sm"
 />
 <div className="flex flex-wrap gap-1 mt-1">
 {tags.map((t, i) => (
 <span key={i} className="text-xs bg-[var(--color-bg-active)] text-[var(--color-text-main)] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium border border-[var(--color-border-subtle)]">
 {t}
 <X size={12} className="cursor-pointer text-[var(--color-text-muted)] hover:text-black" onClick={() => handleRemoveTag(t)} />
 </span>
 ))}
 </div>
 </div>

 {/* Notes */}
 <div className="space-y-1.5 flex-1 flex flex-col min-h-[120px]">
 <label className="block text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1">
 <Clipboard size={13} /> Notes
 </label>
 <textarea
 placeholder="Type interaction notes..."
 value={notes}
 onChange={(e) => setNotes(e.target.value)}
 className="w-full flex-1 bg-[var(--color-bg-subtle)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] text-sm resize-none"
 />
 </div>

 <button
 onClick={handleSaveDetails}
 disabled={saving}
 className="btn-primary w-full py-2.5 text-sm font-semibold shrink-0"
 >
 {saving ? <Spinner size={16} /> : 'Save Details'}
 </button>
 </div>

 {/* Right panel: Timeline & Tasks */}
 <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-y-auto md:overflow-hidden bg-[var(--color-bg-subtle)]">
 {/* Timeline area */}
 <div className="flex-1 flex flex-col border-b md:border-b-0 md:border-r border-[var(--color-border-subtle)] min-h-[400px] md:min-h-0">
 <div className="p-4 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider flex items-center justify-between shrink-0">
 <span>Unified Interaction History</span>
 </div>

 {/* Message List */}
 <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[var(--color-bg-card)]">
 {timeline.length === 0 ? (
 <div className="h-full flex flex-col items-center justify-center text-[var(--color-text-muted)]">
 <MessageSquare size={36} className="opacity-40 mb-2" />
 <p className="text-xs font-medium">No recorded conversations.</p>
 </div>
 ) : (
 timeline.map((item, idx) => {
  const currentItemDateStr = new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  let showDateSeparator = false;
  if (idx === 0) {
  showDateSeparator = true;
  } else {
  const prevItemDateStr = new Date(timeline[idx - 1].timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  if (currentItemDateStr !== prevItemDateStr) {
  showDateSeparator = true;
  }
  }

  const renderDateSeparator = () => {
  if (!showDateSeparator) return null;
  const dateObj = new Date(item.timestamp);
  const today = new Date();
  const isToday = dateObj.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = dateObj.toDateString() === yesterday.toDateString();
  
  let dateText = currentItemDateStr;
  if (isToday) dateText = 'Today';
  else if (isYesterday) dateText = 'Yesterday';

  return (
  <div className="flex justify-center my-4 select-none fade-in w-full">
  <span className="text-[var(--color-text-muted)] text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg">
  {dateText}
  </span>
  </div>
  );
  };

 if (item.type === 'status_change') {
 return (
 <React.Fragment key={idx}>
 {renderDateSeparator()}
 <div className="flex justify-center my-2.5 select-none fade-in">
 <span className="bg-[var(--color-bg-subtle)] text-[var(--color-text-muted)] text-xs font-medium px-3.5 py-1 rounded-full border border-[var(--color-border-subtle)] text-center max-w-[90%] flex items-center gap-1.5 -xs">
 <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]"></span>
 {item.text} • {new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })} {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 </div>
 </React.Fragment>
 );
 }

  const isBot = item.sender === 'BOT';
  const isAgent = item.sender === 'AGENT';
  const isOutgoing = isBot || isAgent;
  return (
  <React.Fragment key={idx}>
  {renderDateSeparator()}
  <div className={`flex flex-col ${isOutgoing ? 'items-end' : 'items-start'}`}>
  {/* Bubble label */}
  <span className="text-xs text-[var(--color-text-light)] mb-1 font-semibold flex items-center gap-1 px-1.5">
  {item.type === 'comment' ? (
  <MessageSquare size={10} className="text-purple-400" />
  ) : (
  <MessageCircle size={10} className="text-blue-400" />
  )}
  {isBot ? (item.type === 'comment' ? 'BOT Comment Reply' : 'BOT DM Reply') : isAgent ? 'Agent Reply' : `@${lead?.username}`} • {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </span>

  {/* Text bubble */}
  <div className={`text-base leading-tight rounded-2xl max-w-[85%] md:max-w-[400px] w-fit flex flex-col overflow-hidden ${
  isOutgoing 
  ? 'bg-[var(--color-msg-outgoing)] text-[var(--color-msg-outgoing-text)] rounded-tr-none px-3.5 py-2.5' 
  : 'bg-[var(--color-msg-incoming)] text-[var(--color-msg-incoming-text)] rounded-tl-none'
  }`}>
  
  {/* WhatsApp Style Post Context Header for Incoming Comments */}
  {item.type === 'comment' && !isOutgoing && (item.postThumbnail || item.postCaption) && (
    <div className="bg-black/5 flex items-start gap-2 p-2 border-b border-black/10">
      {item.postThumbnail && (
        <div className="w-10 h-10 shrink-0 rounded bg-black/10 overflow-hidden flex items-center justify-center">
          <img src={item.postThumbnail} alt="Post" className="w-full h-full object-cover" />
        </div>
      )}
      {item.postCaption && (
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase font-bold text-black/40 mb-0.5 tracking-wider">Instagram Post</p>
          <p className="text-xs text-black/70 line-clamp-2 break-words whitespace-normal">{item.postCaption}</p>
        </div>
      )}
    </div>
  )}

  <div className={!isOutgoing ? "px-3.5 py-2.5" : ""}>
    {(item.replyToId || item.replyToCommentId) && (() => {
      const repliedToId = item.replyToId || item.replyToCommentId;
      const originalMsg = timeline.find(t => t.id === repliedToId);
      if (!originalMsg) return null;
      return (
        <div className="mb-2 pl-2 border-l-2 border-current opacity-70 text-xs overflow-hidden text-ellipsis line-clamp-2">
          <span className="font-semibold">{originalMsg.sender === 'BOT' ? 'BOT' : originalMsg.sender === 'AGENT' ? 'Agent' : `@${lead?.username}`}</span>
          <br />
          {originalMsg.text || 'Attached media'}
        </div>
      );
    })()}

    {item.mediaUrl && item.type !== 'comment' && (
    <div className={`mb-2 rounded-lg overflow-hidden max-w-[120px] border border-[var(--color-border-subtle)] bg-black/5 relative group ${item.postUrl || item.permalink ? 'cursor-pointer' : ''}`}>
      <div className="absolute top-1 right-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider backdrop-blur-sm z-10">Media</div>
    {item.mediaType === 'VIDEO' ? (
    <video src={item.mediaUrl} className="w-full object-cover aspect-square" />
    ) : (
    <img src={item.mediaUrl} alt="post thumbnail" className="w-full object-cover aspect-square" />
    )}
    {(item.postUrl || item.permalink) && (
      <a 
        href={item.postUrl || item.permalink} 
        target="_blank" 
        rel="noopener noreferrer"
        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center z-20"
        title="View on Instagram"
      >
        <Eye size={24} className="text-white drop-shadow-md" />
      </a>
    )}
    </div>
    )}
    {item.text}
  </div>
  </div>
  </div>
  </React.Fragment>
  );
 })
 )}
 <div ref={timelineEndRef} />
 </div>

 {/* Message Input (Commented out as advance access is not yet available) */}
 {false && lead?.platformUserId && (
 <div className="p-4 bg-[var(--color-bg-card)] border-t border-[var(--color-border-subtle)] shrink-0">
 <div className="flex gap-3 border border-[var(--color-border-subtle)] rounded-full px-4 py-2 bg-[var(--color-bg-card)] items-center transition-colors duration-300">
 <input 
 type="text"
 value={replyText}
 onChange={e => setReplyText(e.target.value)}
 onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
 placeholder="Message..."
 className="flex-1 bg-transparent border-none text-base focus:outline-none transition-all text-[var(--color-text-main)] placeholder-[var(--color-text-muted)]"
 />

 {/* Canned Templates Insertion */}
 <div className="relative flex items-center shrink-0">
 <button
 type="button"
 onClick={() => setShowTemplatesPopover(!showTemplatesPopover)}
 className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors cursor-pointer"
 title="Insert Reply Template"
 >
 <FileText size={18} />
 </button>
 
 {showTemplatesPopover && (
 <div className="absolute bottom-10 right-0 w-64 bg-[var(--color-bg-card)] border border-[var(--color-border-subtle)] rounded-xl z-50 flex flex-col max-h-48 overflow-y-auto fade-in">
 <div className="px-3 py-2 border-b border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider bg-[var(--color-bg-subtle)] flex items-center justify-between shrink-0">
 <span>Reply Templates</span>
 <button onClick={() => setShowTemplatesPopover(false)} className="text-[var(--color-text-light)] hover:text-black">
 <X size={12} />
 </button>
 </div>
 {templates.length === 0 ? (
 <div className="p-3 text-xs text-[var(--color-text-light)] italic text-center">
 No templates saved.
 </div>
 ) : (
 templates.map(t => (
 <button
 key={t._id}
 type="button"
 onClick={() => {
 setReplyText(prev => prev + t.body);
 setShowTemplatesPopover(false);
 }}
 className="w-full text-left px-3 py-2.5 text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-active)] border-b border-[var(--color-border-subtle)]/50 last:border-0 truncate font-semibold cursor-pointer"
 title={t.body}
 >
 {t.title}
 </button>
 ))
 )}
 </div>
 )}
 </div>

 <button 
 onClick={handleSendMessage}
 disabled={sendingMessage || !replyText.trim()}
 className="text-[var(--color-primary)] font-semibold text-base hover:text-[var(--color-text-main)] transition-colors disabled:opacity-50 disabled:hover:text-[var(--color-primary)]"
 >
 {sendingMessage ? <Spinner size={16} /> : "Send"}
 </button>
 </div>
 </div>
 )}
 </div>

 {/* Task tracking sidebar */}
 {(user?.role === 'admin' || (user?.role === 'agent' && assignedTo && String(assignedTo) === String(user?.id || user?._id))) && (
 <div className="w-full md:w-[320px] p-5 flex flex-col gap-4 overflow-y-auto bg-[var(--color-bg-card)] shrink-0 min-h-[300px] md:min-h-0">
 <h4 className="font-bold text-xs text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border-subtle)] pb-2 flex items-center gap-1.5 shrink-0">
 <Calendar size={13} /> Follow-Up Tasks
 </h4>

 {/* New task form */}
 <form onSubmit={handleAddTask} className="p-3 bg-[var(--color-bg-subtle)] border border-[var(--color-border-subtle)] rounded-xl space-y-3 shrink-0">
 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Type</label>
 <CustomSelect
 value={taskType}
 onChange={(e) => setTaskType(e.target.value)}
 options={[
 { value: "follow_up", label: "Follow Up" },
 { value: "call", label: "Call" },
 { value: "demo", label: "Demo" },
 { value: "close", label: "Close" }
 ]}
 className="w-full"
 />
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Due Date</label>
 <input
 type="date"
 value={taskDue}
 onChange={(e) => setTaskDue(e.target.value)}
 className="w-full bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] text-sm"
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-2 gap-2">
 <div className="space-y-1">
 <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Priority</label>
 <CustomSelect
 value={taskPriority}
 onChange={(e) => setTaskPriority(e.target.value)}
 options={[
 { value: "low", label: "Low" },
 { value: "medium", label: "Medium" },
 { value: "high", label: "High" }
 ]}
 className="w-full"
 />
 </div>

 {user?.role === 'admin' && (
 <div className="space-y-1">
  <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Assign To</label>
  <CustomSelect
  value={taskAssignedTo || assignedTo || 'unassigned'}
  onChange={(e) => setTaskAssignedTo(e.target.value)}
  options={[
  { value: "unassigned", label: "Unassigned" },
  ...(user ? [{ value: user.id || user._id, label: "Assign to Me" }] : []),
  ...agents
  .filter(a => String(a._id) !== String(user?.id || user?._id))
  .map(a => ({ value: a._id, label: `${a.name} (${a.role})` }))
  ]}
  className="w-full"
  />
  </div>
 )}
 </div>

 <div className="space-y-1">
 <label className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Task notes</label>
 <input
 type="text"
 placeholder="e.g. Discuss custom pricing"
 value={taskNotes}
 onChange={(e) => setTaskNotes(e.target.value)}
 className="w-full bg-[var(--color-bg-card)] text-[var(--color-text-main)] border border-[var(--color-border-subtle)] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[var(--color-primary)] text-sm"
 />
 </div>

 <button
 type="submit"
 disabled={addingTask}
 className="btn-primary w-full py-1.5 text-xs font-semibold"
 >
 <Plus size={12} /> Add Task
 </button>
 </form>

 {/* Tasks List */}
 <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
 {tasks.length === 0 ? (
 <div className="text-center py-6 text-xs text-[var(--color-text-light)] font-medium">
 No scheduled tasks.
 </div>
 ) : (
 tasks.map(task => (
 <div 
 key={task._id}
 className={`p-3 border rounded-xl flex items-start gap-2.5 transition-all ${
 task.status === 'completed' 
 ? 'border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)]/50 opacity-70' 
 : 'border-[var(--color-border-subtle)] bg-[var(--color-bg-card)] hover:border-[var(--color-border-focus)]'
 }`}
 >


 <div className="flex-1 min-w-0">
 <div className={`text-xs font-semibold flex items-center justify-between gap-1.5 ${task.status === 'completed' ? 'line-through text-[var(--color-text-muted)]' : 'text-[var(--color-text-main)]'}`}>
 <span className="capitalize">{task.type.replace('_', ' ')}</span>
 <span className={`text-xs uppercase font-bold px-1.5 py-0.5 rounded ${
 task.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' :
 task.priority === 'low' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
 }`}>
 {task.priority || 'medium'}
 </span>
 </div>
 {task.notes && (
 <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate leading-tight">
 {task.notes}
 </p>
 )}
 <span className="text-xs text-[var(--color-text-light)] font-semibold mt-1 block uppercase">
 Due: {new Date(task.dueAt).toLocaleDateString([], {month: 'short', day: 'numeric'})}
 </span>
 </div>

 <button 
 onClick={() => handleDeleteTask(task._id)}
 className="text-[var(--color-text-light)] hover:text-[var(--color-status-error)] transition-colors shrink-0"
 >
 <Trash2 size={13} />
 </button>
 </div>
 ))
 )}
 </div>
 </div>
 )}
 </div>
 </div>
 </div>
 
 <ConfirmationDialog 
 isOpen={showDeleteConfirm}
 onClose={() => {
 setShowDeleteConfirm(false);
 setTaskToDelete(null);
 }}
 onConfirm={confirmDeleteTask}
 title="Delete Task"
 message="Are you sure you want to permanently delete this task?"
 confirmText="Delete Task"
 isLoading={isDeletingTask}
 />
 </div>,
 document.body
 );
}
