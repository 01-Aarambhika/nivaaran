import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import StaffDashboard from './pages/StaffDashboard';
import AdminDashboard from './pages/AdminDashboard';
import FileComplaintModal from './components/FileComplaintModal';
import ComplaintDetailDrawer from './components/ComplaintDetailDrawer';
import AssignModal from './components/AssignModal';
import FeedbackModal from './components/FeedbackModal';

function MainApp() {
  const { user } = useAuth();
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [assigningComplaint, setAssigningComplaint] = useState(null);
  const [feedbackComplaint, setFeedbackComplaint] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

  const handleComplaintUpdated = (updated) => {
    setSelectedComplaint(updated);
    handleRefresh();
  };

  return (
    <div className="app-container">
      <Navbar onOpenNewComplaint={() => setShowFileModal(true)} />

      <main className="main-content">
        {!user ? (
          <Login />
        ) : user.role === 'student' ? (
          <StudentDashboard
            onOpenFileModal={() => setShowFileModal(true)}
            onSelectComplaint={setSelectedComplaint}
            refreshTrigger={refreshTrigger}
          />
        ) : ['warden', 'mess_incharge', 'maintenance_staff'].includes(user.role) ? (
          <StaffDashboard
            onSelectComplaint={setSelectedComplaint}
            refreshTrigger={refreshTrigger}
          />
        ) : user.role === 'admin' ? (
          <AdminDashboard
            onSelectComplaint={setSelectedComplaint}
            onOpenAssign={setAssigningComplaint}
            refreshTrigger={refreshTrigger}
          />
        ) : (
          <Login />
        )}
      </main>

      {/* Modals & Drawers */}
      <FileComplaintModal
        isOpen={showFileModal}
        onClose={() => setShowFileModal(false)}
        onSuccess={(newC) => {
          handleRefresh();
          setSelectedComplaint(newC);
        }}
      />

      <ComplaintDetailDrawer
        complaint={selectedComplaint}
        onClose={() => setSelectedComplaint(null)}
        onUpdate={handleComplaintUpdated}
        onOpenAssign={(c) => {
          setSelectedComplaint(null);
          setAssigningComplaint(c);
        }}
        onOpenFeedback={(c) => {
          setSelectedComplaint(null);
          setFeedbackComplaint(c);
        }}
      />

      <AssignModal
        isOpen={!!assigningComplaint}
        complaint={assigningComplaint}
        onClose={() => setAssigningComplaint(null)}
        onSuccess={() => handleRefresh()}
      />

      <FeedbackModal
        isOpen={!!feedbackComplaint}
        complaint={feedbackComplaint}
        onClose={() => setFeedbackComplaint(null)}
        onSuccess={() => handleRefresh()}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
