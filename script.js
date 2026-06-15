document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide Icons
    lucide.createIcons();

    // ==========================================================================
    // MOBILE MENU LOGIC
    // ==========================================================================
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.querySelector('.nav-links');

    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('mobile-active');
        });

        // Close menu when clicking link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuToggle.classList.remove('active');
                navLinks.classList.remove('mobile-active');
            });
        });
    }

    // ==========================================================================
    // SKILLS TABS TOGGLE
    // ==========================================================================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and contents
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active class to current elements
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // ==========================================================================
    // BACKGROUND SIGNAL CANVAS ANIMATION (PCB TRACKS)
    // ==========================================================================
    const canvas = document.getElementById('signalCanvas');
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = (canvas.width = window.innerWidth);
        height = (canvas.height = window.innerHeight);
    });

    // PCB Node definition
    class Point {
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
    }

    class Trace {
        constructor() {
            this.points = [];
            this.generateTrace();
            this.progress = 0;
            this.speed = 0.005 + Math.random() * 0.008;
            this.color = Math.random() > 0.4 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 157, 0, 0.3)';
            this.width = Math.random() > 0.8 ? 2 : 1;
        }

        generateTrace() {
            // Start from window boundaries
            let x = Math.random() * width;
            let y = Math.random() * height;
            
            // Align to 40px grid for PCB look
            x = Math.floor(x / 40) * 40;
            y = Math.floor(y / 40) * 40;
            
            this.points.push(new Point(x, y));

            const length = 3 + Math.floor(Math.random() * 4);
            let currentX = x;
            let currentY = y;

            for (let i = 0; i < length; i++) {
                const angleChoice = Math.floor(Math.random() * 4);
                // 0: 0deg, 1: 45deg, 2: 90deg, 3: -45deg
                let nextX = currentX;
                let nextY = currentY;

                if (angleChoice === 0) {
                    nextX += 80;
                } else if (angleChoice === 1) {
                    nextX += 80;
                    nextY += 80;
                } else if (angleChoice === 2) {
                    nextY += 80;
                } else {
                    nextX += 80;
                    nextY -= 80;
                }

                if (nextX < width && nextY > 0 && nextY < height) {
                    this.points.push(new Point(nextX, nextY));
                    currentX = nextX;
                    currentY = nextY;
                } else {
                    break;
                }
            }
        }

        update() {
            this.progress += this.speed;
            if (this.progress >= 1) {
                this.progress = 0;
                this.points = [];
                this.generateTrace();
            }
        }

        draw() {
            if (this.points.length < 2) return;

            // Draw underlying track
            ctx.beginPath();
            ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                ctx.lineTo(this.points[i].x, this.points[i].y);
            }
            ctx.strokeStyle = 'rgba(30, 41, 59, 0.15)';
            ctx.lineWidth = this.width;
            ctx.stroke();

            // Draw current active signal particle
            const totalSegments = this.points.length - 1;
            const segmentProgress = this.progress * totalSegments;
            const currentSegment = Math.floor(segmentProgress);
            const t = segmentProgress - currentSegment;

            if (currentSegment < totalSegments) {
                const p1 = this.points[currentSegment];
                const p2 = this.points[currentSegment + 1];
                
                const curX = p1.x + (p2.x - p1.x) * t;
                const curY = p1.y + (p2.y - p1.y) * t;

                // Draw glowing pulse dot
                ctx.beginPath();
                ctx.arc(curX, curY, this.width + 1.5, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.shadowBlur = 8;
                ctx.shadowColor = this.color;
                ctx.fill();
                ctx.shadowBlur = 0; // reset
            }
        }
    }

    const traces = [];
    for (let i = 0; i < 20; i++) {
        traces.push(new Trace());
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, width, height);
        traces.forEach(trace => {
            trace.update();
            trace.draw();
        });
        requestAnimationFrame(animateCanvas);
    }
    animateCanvas();


    // ==========================================================================
    // PROJECT 1: INTERACTIVE RISC-V PIPELINED ALU SIMULATOR
    // ==========================================================================
    const instSelect = document.getElementById('instSelect');
    const btnStepALU = document.getElementById('btnStepALU');
    const btnResetALU = document.getElementById('btnResetALU');
    const aluConsole = document.getElementById('aluConsole');
    const aluStatus = document.getElementById('aluStatus');

    const stages = {
        IF: document.getElementById('stageIF'),
        ID: document.getElementById('stageID'),
        EX: document.getElementById('stageEX'),
        WB: document.getElementById('stageWB')
    };

    const stageDataLabels = {
        IF: document.getElementById('dataIF'),
        ID: document.getElementById('dataID'),
        EX: document.getElementById('dataEX'),
        WB: document.getElementById('dataWB')
    };

    // Pre-defined instruction queues
    const queues = {
        add_sub: [
            { inst: 'ADD R1, R2, R3', desc: 'Fetch ADD instruction. Load operand registers.' },
            { inst: 'SUB R4, R1, R5', desc: 'Fetch SUB instruction. Load operands.' },
            { inst: 'NOP', desc: 'Empty pipeline filler instruction.' },
            { inst: 'NOP', desc: 'Empty pipeline filler instruction.' }
        ],
        raw_hazard: [
            { inst: 'ADD R1, R2, R3', desc: 'Fetch ADD instruction. Writeback target: R1.' },
            { inst: 'ADD R4, R1, R6', desc: 'RAW Hazard detected! R1 is updated by previous instruction.' },
            { inst: 'NOP', desc: 'Data forwarding bypassing activated from EX stage to EX input.' },
            { inst: 'NOP', desc: 'Empty pipeline filler instruction.' }
        ],
        logic_ops: [
            { inst: 'XOR R5, R1, R2', desc: 'Fetch bitwise XOR instruction.' },
            { inst: 'AND R6, R5, R3', desc: 'Fetch bitwise AND instruction.' },
            { inst: 'NOP', desc: 'Empty pipeline filler instruction.' },
            { inst: 'NOP', desc: 'Empty pipeline filler instruction.' }
        ]
    };

    let aluCycle = 0;
    let pipelineState = ['NOP', 'NOP', 'NOP', 'NOP']; // WB, EX, ID, IF

    function updateALUPipeline() {
        const queueKey = instSelect.value;
        const currentQueue = queues[queueKey];

        // Step pipeline contents (IF -> ID -> EX -> WB)
        // Shift right: WB gets EX, EX gets ID, ID gets IF, IF gets new inst
        pipelineState.unshift('NOP'); // Add NOP placeholder at index 0
        pipelineState.pop(); // Remove oldest item (WB)

        // Index mappings:
        // pipelineState[0] is newly fetched (IF)
        // pipelineState[1] is ID
        // pipelineState[2] is EX
        // pipelineState[3] is WB
        
        let newInst = 'NOP';
        if (aluCycle < currentQueue.length) {
            newInst = currentQueue[aluCycle].inst;
        }

        pipelineState[0] = newInst;

        // Visual updates
        stageDataLabels.IF.textContent = pipelineState[0];
        stageDataLabels.ID.textContent = pipelineState[1];
        stageDataLabels.EX.textContent = pipelineState[2];
        stageDataLabels.WB.textContent = pipelineState[3];

        // Toggle active glows based on current contents
        Object.keys(stages).forEach((stage, idx) => {
            const stateVal = pipelineState[idx];
            if (stateVal && stateVal !== 'NOP') {
                stages[stage].classList.add('active');
            } else {
                stages[stage].classList.remove('active');
            }
        });

        // Console logger output
        let consoleMsg = `[Cycle ${aluCycle + 1}]\n`;
        consoleMsg += `IF Stage  : Loaded "${pipelineState[0]}"\n`;
        consoleMsg += `ID Stage  : Decoding "${pipelineState[1]}"\n`;
        consoleMsg += `EX Stage  : Computing ALU operands for "${pipelineState[2]}"\n`;
        consoleMsg += `WB Stage  : Register file writeback complete for "${pipelineState[3]}"\n`;

        // Check for specific hazard descriptions
        if (queueKey === 'raw_hazard') {
            if (aluCycle === 1) {
                consoleMsg += `⚠️ WARNING: Read-After-Write (RAW) Hazard on R1 between instruction 1 and 2!\n`;
            } else if (aluCycle === 2) {
                consoleMsg += `⚡ FORWARDING ACTIVE: Data forwarded directly from EX output to ALU input path, preventing clock stall!\n`;
            }
        } else {
            consoleMsg += `✓ Execution path timing: Slack positive (T_slack = +0.28ns). No setup violations.\n`;
        }

        aluConsole.textContent = consoleMsg;
        aluStatus.textContent = `Running (Cycle ${aluCycle + 1})`;
        aluStatus.style.color = 'var(--color-neon-lime)';
        
        aluCycle++;
    }

    btnStepALU.addEventListener('click', updateALUPipeline);

    btnResetALU.addEventListener('click', () => {
        aluCycle = 0;
        pipelineState = ['NOP', 'NOP', 'NOP', 'NOP'];
        Object.keys(stageDataLabels).forEach(key => {
            stageDataLabels[key].textContent = 'NOP';
        });
        Object.keys(stages).forEach(key => {
            stages[key].classList.remove('active');
        });
        aluConsole.textContent = '[System initialized. Load instruction queue and step clock to begin simulation.]';
        aluStatus.textContent = 'Clock Idle';
        aluStatus.style.color = 'var(--color-copper-gold)';
    });


    // ==========================================================================
    // PROJECT 2: INTERACTIVE BARREL SHIFTER MUX GRID
    // ==========================================================================
    const shifterInput = document.getElementById('shifterInput');
    const shiftAmt = document.getElementById('shiftAmt');
    const shiftAmtVal = document.getElementById('shiftAmtVal');
    const shiftType = document.getElementById('shiftType');
    const inputBinDisplay = document.getElementById('inputBinDisplay');
    const outputBinDisplay = document.getElementById('outputBinDisplay');
    const muxSignalsLog = document.getElementById('muxSignalsLog');

    function calculateShift() {
        let binaryStr = shifterInput.value.replace(/[^01]/g, ''); // filter non-binary
        
        // Pad or truncate to 8 bits
        if (binaryStr.length < 8) {
            binaryStr = binaryStr.padEnd(8, '0');
        } else if (binaryStr.length > 8) {
            binaryStr = binaryStr.substring(0, 8);
        }
        shifterInput.value = binaryStr;

        const amt = parseInt(shiftAmt.value, 10);
        shiftAmtVal.textContent = `${amt} bit${amt !== 1 ? 's' : ''}`;

        const mode = shiftType.value;
        let result = '';

        if (mode === 'LSL') {
            result = binaryStr.substring(amt) + '0'.repeat(amt);
        } else if (mode === 'LSR') {
            result = '0'.repeat(amt) + binaryStr.substring(0, 8 - amt);
        } else if (mode === 'ASR') {
            const signBit = binaryStr[0];
            result = signBit.repeat(amt) + binaryStr.substring(0, 8 - amt);
        }

        // Render binary bit cells
        renderBitCells(inputBinDisplay, binaryStr);
        renderBitCells(outputBinDisplay, result);

        // Print signal route details
        let muxLog = `Shifting ${binaryStr} by ${amt} bits using ${mode} logic.\n`;
        const logStages = Math.ceil(Math.log2(8)); // log2(8) = 3 stages
        muxLog += `MUX tree layers: ${logStages} levels deep. Select lines: S2=${(amt & 4) ? '1' : '0'}, S1=${(amt & 2) ? '1' : '0'}, S0=${(amt & 1) ? '1' : '0'}.\n`;
        muxLog += `Status: Combined propagation delay estimated at ~0.45ns. No latches inferred.`;
        
        muxSignalsLog.textContent = muxLog;
    }

    function renderBitCells(container, bits) {
        container.innerHTML = '';
        for (let i = 0; i < bits.length; i++) {
            const cell = document.createElement('div');
            cell.classList.add('bin-cell');
            if (bits[i] === '1') {
                cell.classList.add('active-bit');
            }
            cell.textContent = bits[i];
            container.appendChild(cell);
        }
    }

    // Event listeners for shifter inputs
    shifterInput.addEventListener('input', calculateShift);
    shiftAmt.addEventListener('input', calculateShift);
    shiftType.addEventListener('change', calculateShift);

    // Run initial calculation
    calculateShift();


    // ==========================================================================
    // PROJECT 3: INTERACTIVE SYSTOLIC ARRAY
    // ==========================================================================
    const btnStepSystolic = document.getElementById('btnStepSystolic');
    const btnResetSystolic = document.getElementById('btnResetSystolic');
    const systolicConsole = document.getElementById('systolicConsole');
    const systolicStatus = document.getElementById('systolicStatus');

    let systolicCycle = 0;
    
    btnStepSystolic.addEventListener('click', () => {
        systolicCycle++;
        systolicStatus.textContent = `Cycle ${systolicCycle}`;
        systolicStatus.style.color = 'var(--color-neon-lime)';

        // Remove active class from all PE nodes
        document.querySelectorAll('.pe-node').forEach(node => {
            node.classList.remove('active-pe');
        });

        // Activate PEs progressively along diagonal wavefronts
        // PE r, c is active if (r + c + 1) === systolicCycle or variations
        let activePECount = 0;
        for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 4; c++) {
                if ((r + c + 1) === systolicCycle) {
                    const pe = document.getElementById(`pe_${r}_${c}`);
                    if (pe) {
                        pe.classList.add('active-pe');
                        activePECount++;
                    }
                }
            }
        }

        let sysMsg = `[Clock Cycle ${systolicCycle}]\n`;
        if (activePECount > 0) {
            sysMsg += `✓ Diagonal Wavefront active. Propagating inputs A and B through ${activePECount} Processing Elements.\n`;
            sysMsg += `Computing MAC functions: Acc <= Acc + (RegA * RegB) internally.\n`;
        } else if (systolicCycle > 7) {
            sysMsg += `✓ Matrix multiplication complete. Row outputs fully drained into local accumulator buffers.\n`;
            systolicStatus.textContent = 'Completed';
            systolicStatus.style.color = 'var(--color-electric-blue)';
        } else {
            sysMsg += `Wavefront loading cycle. Await inputs.\n`;
        }
        sysMsg += `Synthesized on FPGA: Slices used: 64/5200 | DSP Blocks: 16/120.`;
        systolicConsole.textContent = sysMsg;
    });

    btnResetSystolic.addEventListener('click', () => {
        systolicCycle = 0;
        document.querySelectorAll('.pe-node').forEach(node => {
            node.classList.remove('active-pe');
        });
        systolicConsole.textContent = '[Click Pulse to propagate matrix operands through processing cells.]';
        systolicStatus.textContent = 'Ready';
        systolicStatus.style.color = 'var(--color-copper-gold)';
    });


    // ==========================================================================
    // Retro CLI Developer Console Shell
    // ==========================================================================
    const terminalInput = document.getElementById('terminalInput');
    const terminalScreen = document.getElementById('terminalScreen');
    
    // Command logs
    if (terminalInput && terminalScreen) {
        // Focus terminal on click anywhere on screen
        terminalScreen.addEventListener('click', () => {
            terminalInput.focus();
        });

        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const command = terminalInput.value.trim().toLowerCase();
                terminalInput.value = '';
                
                // Print command
                appendTerminalLine(`rohan@nit_ece_core:~$ ${command}`, 'term-cyan');
                
                // Parse command
                executeTerminalCommand(command);
            }
        });
    }

    function appendTerminalLine(text, className = '') {
        const outputDiv = terminalScreen.querySelector('.terminal-output');
        const p = document.createElement('p');
        if (className) p.classList.add(className);
        p.textContent = text;
        outputDiv.appendChild(p);
        
        // Scroll to bottom
        terminalScreen.scrollTop = terminalScreen.scrollHeight;
    }

    function executeTerminalCommand(cmd) {
        if (!cmd) return;

        switch (cmd) {
            case 'help':
                appendTerminalLine('Available registers (commands):');
                appendTerminalLine('  about             Prints professional bio and metrics.');
                appendTerminalLine('  skills            List of verified engineering skills.');
                appendTerminalLine('  projects          Displays highlight hardware projects.');
                appendTerminalLine('  neofetch          Spits system status in neofetch format.');
                appendTerminalLine('  status            Queries simulated board sensors.');
                appendTerminalLine('  download-resume   Opens PDF resume directly.');
                appendTerminalLine('  clear             Flushes screen buffer.');
                break;
                
            case 'about':
                appendTerminalLine('Profile: Rohan Sen');
                appendTerminalLine('Specialization: Electronics and Communication Engineering');
                appendTerminalLine('Focus: Hardware design, RTL logic, VLSI Physical layout architectures.');
                appendTerminalLine('Academic Profile: NIT B.Tech Student (GPA: 9.27/10.0).');
                break;
                
            case 'skills':
                appendTerminalLine('--- Digital Design & RTL ---', 'term-yellow');
                appendTerminalLine('  Verilog, SystemVerilog, Logic Partitioning, Timing Constraints');
                appendTerminalLine('--- Physical Design & STA ---', 'term-yellow');
                appendTerminalLine('  Floorplanning, Clock Tree Synthesis (CTS), Routing, MCMM timing closure');
                appendTerminalLine('--- Systems & Tools ---', 'term-yellow');
                appendTerminalLine('  Xilinx Vivado, Cadence Virtuoso, ModelSim, MATLAB, Python, C');
                break;
                
            case 'projects':
                appendTerminalLine('Highlights:');
                appendTerminalLine('1. RISC-V Pipelined ALU (Verilog RTL, Vivado)');
                appendTerminalLine('   4-stage pipeline with hazard forwarding logic.');
                appendTerminalLine('2. Parameterized Barrel Shifter (Verilog structural)');
                appendTerminalLine('   MUX-tree architecture, zero latency loops.');
                appendTerminalLine('3. Systolic Array Matrix Multiplier (SystemVerilog)');
                appendTerminalLine('   2D systolic core optimized for hardware tensor dot-products.');
                break;

            case 'neofetch':
                appendTerminalLine('      _.._          rohan@nit_ece_core');
                appendTerminalLine('    .\' .-\' \`.       ------------------');
                appendTerminalLine('   /  /  .-. \\      OS: NIT_ECE_BOARD_V2');
                appendTerminalLine('   |  |  | | |      Kernel: RTL-to-GDS-Flow v1.2');
                appendTerminalLine('   \\  \\  `-\' /      Uptime: 20 Semesters (est)');
                appendTerminalLine('    \`. `-.-\' \`      CGPA: 9.27 / 10.0');
                appendTerminalLine('      `\'`           Shell: bash/tcl-vivado');
                appendTerminalLine('                    RTL-HDL: Verilog, SystemVerilog');
                appendTerminalLine('                    EDA-Tools: Xilinx Vivado, Cadence Virtuoso');
                break;
                
            case 'status':
                appendTerminalLine('Reading NIT_ECE_BOARD_V2 sensors...');
                appendTerminalLine('  Voltage Rail 1.2V Core : 1.205 V [OK]', 'term-green');
                appendTerminalLine('  System Temp            : 42.8°C [OK]', 'term-green');
                appendTerminalLine('  Current Clock Speed    : 3.20 GHz [MAX]', 'term-green');
                appendTerminalLine('  Fan Duty Cycle         : 32% [AUTO]');
                break;
                
            case 'download-resume':
                appendTerminalLine('Opening resume connection stream... Download requested.', 'term-green');
                setTimeout(() => {
                    window.open('assets/Rohan_Sen_Resume.pdf', '_blank');
                }, 800);
                break;
                
            case 'clear':
                const outputDiv = terminalScreen.querySelector('.terminal-output');
                outputDiv.innerHTML = '';
                break;
                
            default:
                appendTerminalLine(`Error: Register "${cmd}" not recognized. Type 'help' for command map.`, 'term-yellow');
        }
    }


    // ==========================================================================
    // CONTACT FORM SUBMISSION HANDLER
    // ==========================================================================
    const contactForm = document.getElementById('contactForm');
    const formSubmitBtn = document.getElementById('formSubmitBtn');
    const formStatus = document.getElementById('formStatus');

    if (contactForm && formStatus) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            formSubmitBtn.disabled = true;
            formSubmitBtn.innerHTML = '<i class="lucide-refresh-cw animate-spin"></i> Transmitting...';
            formStatus.textContent = 'Transmitting signal data package...';
            formStatus.className = 'form-status term-cyan';

            setTimeout(() => {
                const name = document.getElementById('formName').value;
                const email = document.getElementById('formEmail').value;
                const subject = document.getElementById('formSubject').value;
                const message = document.getElementById('formMessage').value;

                // Log to local storage as mock submission database
                const submissions = JSON.parse(localStorage.getItem('contact_submissions') || '[]');
                submissions.push({ name, email, subject, message, date: new Date().toISOString() });
                localStorage.setItem('contact_submissions', JSON.stringify(submissions));

                formSubmitBtn.disabled = false;
                formSubmitBtn.innerHTML = '<i data-lucide="send"></i> Transmit Signal';
                lucide.createIcons(); // refresh icon

                formStatus.textContent = '✓ Signal received successfully. Sub-channel open.';
                formStatus.className = 'form-status term-green';

                // Reset form
                contactForm.reset();
            }, 1500);
        });
    }
});
