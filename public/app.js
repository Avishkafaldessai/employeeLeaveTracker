
    angular.module('leaveApp', [])
 .filter('trustHtml', ['$sce', function($sce) {
  return function(text) {
    return $sce.trustAsHtml(text);
  };
}])
      .controller('MainCtrl', ['$http', '$timeout', function($http, $timeout){
        const vm = this;

        vm.sidebarCollapsed = window.innerWidth < 1024;
        vm.activeTab = 'overview';
        vm.activeSubTab = 'activities';
        
        // Chatbot
        vm.chatbotOpen = false;
        vm.chatInput = '';
        vm.chatMessages = [];

        // Dynamic data
        vm.profile = {};
        vm.reporting = null;
        vm.departmentMembers = [];
        vm.schedule = {};
        vm.leaves = [];
        vm.leavesSorted = [];
        vm.holidays = [];

        // Stats and new leave form
        vm.stats = { totalLeaves: 0, approved: 0, pending: 0 };
        vm.newLeave = { employee_name: '', start_date: '', end_date: '', type: 'Casual', reason: '' };

        // UI controls
        vm.toggleSidebar = function(){ 
          vm.sidebarCollapsed = !vm.sidebarCollapsed; 
        };
        
        vm.setTab = function(tab){
          vm.activeTab = tab;
          $timeout(function(){
            if(tab === 'calendar'){
              vm.renderCalendar('#calendar', { height: 600 });
            } else if(tab === 'overview'){
              vm.renderCalendar('#overview-calendar', { height: 400 });
              vm.renderCalendar('#mini-calendar', { initialView: 'dayGridWeek', height: 140, headerToolbar:false });
            }
          }, 100);
        };

        // Inline sub-tabs
        vm.setSubTab = function(sub){
          vm.activeSubTab = sub;
          if(sub === 'leave'){
            vm.sortLeaves();
          }
        };

        vm.formatDisplayDate = function(d){
          if(!d) return '';
          const datePart = (''+d).split('T')[0];
          const parts = datePart.split('-');
          if(parts.length === 3){
            const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            return `${('0'+parts[2]).slice(-2)}-${months[parseInt(parts[1],10)-1]}-${parts[0]}`;
          }
          return d;
        };

        vm.clearForm = function(){
          vm.newLeave = { 
            employee_name: vm.profile.employee_name || '', 
            start_date: '', 
            end_date: '', 
            type: 'Casual', 
            reason: '' 
          };
        };

        vm.toggleCheckIn = function(){
          if(!vm.checkedIn){
            vm.checkedIn = true;
            vm.checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else {
            vm.checkedIn = false;
            vm.checkInTime = '';
          }
        };

vm.approveLeave = function (leave) {
  if (!confirm('Approve this leave?')) return;
  $http.put(`/api/leaves/${leave.id}/approve`)
    .then(res => {
      leave.status = res.data.status;
      alert('Leave approved successfully!');
      vm.loadAll();
    })
    .catch(err => {
      console.error('Approve failed', err);
      alert('Error approving leave.');
    });
};

vm.deleteLeave = function (leave) {
  if (!confirm('Delete this leave?')) return;
  $http.delete(`/api/leaves/${leave.id}`)
    .then(() => {
      vm.leaves = vm.leaves.filter(l => l.id !== leave.id);
      alert('Leave deleted successfully!');
      vm.loadAll();
    })
    .catch(err => {
      console.error('Delete failed', err);
      alert('Error deleting leave.');
    });
};



        // Compute stats from leaves
        vm.computeStats = function(){
          const all = vm.leaves || [];
          vm.stats.totalLeaves = all.length;
          vm.stats.approved = all.filter(x => (x.status || '').toLowerCase() === 'approved').length;
          vm.stats.pending = all.filter(x => (x.status || '').toLowerCase() === 'pending').length;
        };

        // Compute leaves per type and render small SVG bar chart
        vm.renderLeavesChart = function(){
          const container = document.getElementById('leaves-chart');
          if(!container) return;
          container.innerHTML = '';

          const byType = {};
          (vm.leaves || []).forEach(l => {
            const t = l.type || 'Other';
            byType[t] = (byType[t] || 0) + 1;
          });

          const entries = Object.keys(byType).map(k => ({ type: k, count: byType[k] }));
          if(entries.length === 0){
            container.innerHTML = '<div class="muted">No data</div>';
            return;
          }

          const width = container.clientWidth || 320;
          const barHeight = 20;
          const gap = 12;
          const height = entries.length * (barHeight + gap);
          const max = Math.max(...entries.map(e => e.count));

          const svgNS = 'http://www.w3.org/2000/svg';
          const svg = document.createElementNS(svgNS, 'svg');
          svg.setAttribute('width', width);
          svg.setAttribute('height', height);

          entries.forEach((e, i) => {
            const y = i * (barHeight + gap);
            const barW = (max === 0) ? 0 : Math.round((e.count / max) * (width - 100));
            
            const label = document.createElementNS(svgNS, 'text');
            label.setAttribute('x', 6);
            label.setAttribute('y', y + barHeight - 5);
            label.setAttribute('font-size', '13');
            label.setAttribute('fill', '#334155');
            label.setAttribute('font-weight', '600');
            label.textContent = e.type;
            svg.appendChild(label);
            
            const rect = document.createElementNS(svgNS, 'rect');
            rect.setAttribute('x', 110);
            rect.setAttribute('y', y + 2);
            rect.setAttribute('width', barW);
            rect.setAttribute('height', barHeight - 4);
            rect.setAttribute('rx', 4);
            rect.setAttribute('fill', '#2563eb');
            svg.appendChild(rect);
            
            const ct = document.createElementNS(svgNS, 'text');
            ct.setAttribute('x', 115 + barW + 6);
            ct.setAttribute('y', y + barHeight - 5);
            ct.setAttribute('font-size', '13');
            ct.setAttribute('fill', '#0f172a');
            ct.setAttribute('font-weight', '700');
            ct.textContent = e.count;
            svg.appendChild(ct);
          });

          container.appendChild(svg);
        };

        // Sort leaves newest first
        vm.sortLeaves = function(){
          vm.leavesSorted = (vm.leaves || []).slice().sort(function(a,b){
            const aDate = a.created_at || a.start_date || '';
            const bDate = b.created_at || b.start_date || '';
            return (bDate > aDate) ? 1 : (bDate < aDate ? -1 : 0);
          });
        };

        vm.applyLeave = function(){
          if(!vm.newLeave.employee_name || !vm.newLeave.start_date || !vm.newLeave.end_date){
            alert('Please fill required fields.');
            return;
          }
          const payload = angular.copy(vm.newLeave);
          payload.status = payload.status || 'Pending';

          // Optimistic add
          vm.leaves.unshift(payload);
          vm.sortLeaves();
          vm.computeStats();
          vm.renderLeavesChart();

          $http.post('/api/leaves', payload).then(function(res){
            if(res.data && res.data.id){
              const idx = vm.leaves.findIndex(l => !l.id && l.employee_name === payload.employee_name && l.start_date === payload.start_date && l.end_date === payload.end_date);
              if(idx !== -1) vm.leaves[idx] = res.data;
              Swal.fire({
                title: 'Leave Applied Successfully!',
                text: 'Your leave request has been submitted successfully.',
                icon: 'success',
                confirmButtonText: 'OK',
                confirmButtonColor: '#3085d6',
                background: '#f9f9f9',
                color: '#333'
              });
              
            }
            vm.clearForm();
            $timeout(function(){
              vm.renderCalendar('#overview-calendar', { height: 400 });
              vm.renderCalendar('#calendar', { height: 600 });
            }, 100);
            vm.computeStats();
            vm.renderLeavesChart();
            vm.sortLeaves();
          }).catch(function(){
            alert('Server not reachable. Leave kept locally.');
            
            vm.clearForm();
          });
        };

        // Render FullCalendar
        vm.renderCalendar = function(selector, options){
          try {
            const el = document.querySelector(selector);
            if(!el) return;
            if(el._fc && typeof el._fc.destroy === 'function'){ 
              el._fc.destroy(); 
              el._fc = null; 
            }

            const events = [];
            (vm.holidays || []).forEach(h => events.push({ 
              title: h.title, 
              start: h.start, 
              allDay: true, 
              display: 'background',
              backgroundColor: '#fef3c7'
            }));
            
            (vm.leaves || []).forEach(l => {
              const endExclusive = l.end_date ? (new Date(l.end_date).getTime() + 24*60*60*1000) : undefined;
              const endISO = endExclusive ? new Date(endExclusive).toISOString().slice(0,10) : undefined;
              events.push({
                id: l.id,
                title: (l.employee_name || '') + ' · ' + (l.type || ''),
                start: l.start_date,
                end: endISO,
                allDay: true,
                backgroundColor: l.status === 'Approved' ? '#10b981' : '#94a3b8'
              });
            });

            const defaultCfg = {
              initialView: 'dayGridMonth',
              headerToolbar: { 
                left: 'prev,next today', 
                center: 'title', 
                right: 'dayGridMonth,dayGridWeek' 
              },
              events: events,
              height: 400
            };
            const cfg = Object.assign({}, defaultCfg, options || {});
            const cal = new FullCalendar.Calendar(el, cfg);
            cal.render();
            el._fc = cal;
          } catch (err) {
            console.error('Calendar render error', err);
          }
        };

        // Compute stats and chart after loading leaves
        vm.onLeavesLoaded = function(){
          vm.sortLeaves();
          vm.computeStats();
          $timeout(function(){ vm.renderLeavesChart(); }, 100);
        };

        // NEW: Chatbot functions
        vm.toggleChatbot = function(){
          vm.chatbotOpen = !vm.chatbotOpen;
          if(vm.chatbotOpen){
            $timeout(function(){
              const el = document.getElementById('chatMessages');
              if(el) el.scrollTop = el.scrollHeight;
            }, 100);
          }
        };

        vm.chatKeyPress = function(event){
          if(event.keyCode === 13){
            vm.sendChatMessage();
          }
        };

        vm.sendChatMessage = function(message){
          const text = message || vm.chatInput;
          if(!text || !text.trim()) return;

          // Add user message
          vm.chatMessages.push({
            type: 'user',
            text: text
          });
          vm.chatInput = '';

          // Scroll to bottom
          $timeout(function(){
            const el = document.getElementById('chatMessages');
            if(el) el.scrollTop = el.scrollHeight;
          }, 50);

          // Generate bot response
          $timeout(function(){
            const response = vm.generateChatResponse(text.toLowerCase());
            vm.chatMessages.push({
              type: 'bot',
              text: response
            });
            
            $timeout(function(){
              const el = document.getElementById('chatMessages');
              if(el) el.scrollTop = el.scrollHeight;
            }, 50);
          }, 500);
        };

        vm.generateChatResponse = function(message){
          if(message.includes('leave balance') || message.includes('balance')){
            return `You have <strong>${vm.stats.totalLeaves}</strong> total leaves. 
                    <strong>${vm.stats.approved}</strong> approved and 
                    <strong>${vm.stats.pending}</strong> pending.`;
          }
          else if(message.includes('apply') || message.includes('new leave')){
            return 'To apply for leave, use the "Apply for Leave" form on the Overview page or navigate using the sidebar.';
          }
          else if(message.includes('pending')){
            return `You have <strong>${vm.stats.pending}</strong> pending leave requests. 
                    Check the Dashboard or click the "Leave" tab in Overview to see details.`;
          }
          else if(message.includes('approved')){
            return `You have <strong>${vm.stats.approved}</strong> approved leaves. 
                    You can view them in the Dashboard or Calendar.`;
          }
          else if(message.includes('holiday')){
            const next = vm.holidays[0];
            return next ? 
              `Next holiday is <strong>${next.title}</strong> on ${vm.formatDisplayDate(next.start)}.` :
              'No upcoming holidays found.';
          }
          else if(message.includes('help')){
            return `I can help you with:<br>
                    • Check leave balance<br>
                    • Apply for leave<br>
                    • View pending leaves<br>
                    • View upcoming holidays<br>
                    • Approve/Delete leaves<br>
                    Just ask me anything!`;
          }
          else {
            return `I'm here to help! You can ask me about:<br>
                    • Your leave balance<br>
                    • Applying for leave<br>
                    • Pending approvals<br>
                    • Upcoming holidays<br>
                    Type "help" for more options.`;
          }
        };

        // Initial data load
        vm.loadAll = function(){
          $http.get('/api/profile').then(function(res){ 
            vm.profile = res.data || {}; 
            vm.newLeave.employee_name = vm.profile.employee_name || ''; 
          }).catch(()=>{ 
            vm.profile = {}; 
          });
          
          $http.get('/api/reporting').then(function(res){ 
            vm.reporting = res.data || null; 
          }).catch(()=>{ 
            vm.reporting = null; 
          });
          
          $http.get('/api/department-members').then(function(res){ 
            vm.departmentMembers = res.data || []; 
          }).catch(()=>{ 
            vm.departmentMembers = []; 
          });
          
          $http.get('/api/schedule').then(function(res){ 
            vm.schedule = (res.data && res.data[0]) ? res.data[0] : {}; 
          }).catch(()=>{ 
            vm.schedule = {}; 
          });
          
          $http.get('/api/holidays').then(function(res){ 
            vm.holidays = res.data || []; 
          }).catch(()=>{ 
            vm.holidays = []; 
          });

          $http.get('/api/leaves').then(function(res){
            vm.leaves = res.data || [];
            vm.onLeavesLoaded();
          }).catch(function(){ 
            vm.leaves = []; 
            vm.onLeavesLoaded(); 
          }).finally(function(){
            $timeout(function(){ vm.setTab(vm.activeTab); }, 120);
          });
        };

        // Expose
        vm.loadAll();
        window.vm = vm;
      }]);
  