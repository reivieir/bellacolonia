// Substitua pelas suas chaves do Supabase
//const supabaseUrl = 'https://jqpdampcglodtmfmeivk.supabase.co'; 
//const supabaseAnonKey = 'sb_publishable_RnX8Pk3gAeJjM7vnnpWaGg_2zM0ZkyM';
// Substitua pelas suas chaves
const supabaseUrl = 'https://jqpdampcglodtmfmeivk.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_RnX8Pk3gAeJjM7vnnpWaGg_2zM0ZkyM';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let steps = [];

const mainStages = [
    { id: 'start', label: 'INICIAÇÃO', visual: 'cyan' },
    { id: 'planning', label: 'PLANEJAMENTO', visual: 'purple' },
    { id: 'execution', label: 'EXECUÇÃO', visual: 'pink' },
    { id: 'monitoring', label: 'MONITORAMENTO', visual: 'darkblue' },
    { id: 'closing', label: 'ENCERRAMENTO', visual: 'orange' }
];

async function loadSteps() {
    const { data, error } = await supabaseClient
        .from('status_financiamento')
        .select('*')
        .order('numero_passo', { ascending: true });

    if (error) {
        console.error("Erro ao carregar dados:", error);
        document.getElementById('details-grid-container').innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar os dados.</p>';
        return;
    }

    steps = data || [];
    renderSteps();
}

async function toggleStep(index, isChecked) {
    const step = steps[index];
    const novoStatus = isChecked ? 'completed' : 'pending';
    
    step.status = novoStatus;
    renderSteps();

    const { error } = await supabaseClient
        .from('status_financiamento')
        .update({ status: novoStatus })
        .eq('id', step.id);

    if (error) console.error("Erro ao atualizar:", error);
}

async function editStep(index) {
    const step = steps[index];
    const newTitle = prompt("Edite o nome da etapa:", step.titulo);
    if (newTitle === null) return;
    
    const newDesc = prompt("Edite a descrição (deixe em branco para remover):", step.descricao || "");
    if (newDesc === null) return;

    step.titulo = newTitle.trim() || step.titulo;
    step.descricao = newDesc.trim() || null;
    renderSteps();

    const { error } = await supabaseClient
        .from('status_financiamento')
        .update({ titulo: step.titulo, descricao: step.descricao })
        .eq('id', step.id);

    if (error) console.error("Erro ao editar:", error);
}

async function deleteStep(index) {
    const step = steps[index];
    if (confirm(`Tem certeza que deseja excluir a etapa "${step.titulo}"?`)) {
        steps.splice(index, 1);
        renderSteps();

        const { error } = await supabaseClient
            .from('status_financiamento')
            .delete()
            .eq('id', step.id);

        if (error) console.error("Erro ao deletar:", error);
    }
}

async function addNewStep() {
    const stageInput = document.getElementById('new-stage'); 
    const titleInput = document.getElementById('new-title');
    const descInput = document.getElementById('new-desc');

    if (!titleInput.value) {
        alert("Por favor, preencha o Nome da etapa.");
        return;
    }

    // Cria um número interno sequencial só para manter a organização no banco
    const internalNextNum = steps.length > 0 ? Math.max(...steps.map(s => s.numero_passo)) + 1 : 1;

    const novoPasso = {
        numero_passo: internalNextNum, 
        estagio: stageInput.value, 
        titulo: titleInput.value,
        descricao: descInput.value || null,
        status: 'pending'
    };

    titleInput.value = '';
    descInput.value = '';

    const { error } = await supabaseClient
        .from('status_financiamento')
        .insert([novoPasso]);

    if (error) {
        console.error("Erro ao adicionar etapa:", error);
        alert("Erro ao adicionar etapa. Verifique a conexão.");
        return;
    }

    loadSteps();
}

function renderSteps() {
    const waveContainer = document.getElementById('timeline-wave-container');
    const gridContainer = document.getElementById('details-grid-container');
    waveContainer.innerHTML = ''; 
    gridContainer.innerHTML = '';

    const stepsByStage = { start: [], planning: [], execution: [], monitoring: [], closing: [] };
    let firstPendingStep = null;
    let foundFirstPending = false;

    // 1. Agrupa as etapas nos seus blocos corretos
    steps.forEach((step, index) => {
        step.originalIndex = index; 
        const stageId = step.estagio || 'start'; 
        if (stepsByStage[stageId]) {
            stepsByStage[stageId].push(step);
        }
    });

    // 2. NOVO: Calcula a numeração que vai aparecer na tela em tempo real
    let visualCounter = 1;
    mainStages.forEach(stage => {
        stepsByStage[stage.id].forEach(step => {
            step.visualNumber = visualCounter++; // Define números sequenciais de 1 a N
            
            // Aproveita o loop para identificar a etapa atual pendente
            if (step.status !== 'completed' && !foundFirstPending) {
                firstPendingStep = step;
                foundFirstPending = true;
            }
        });
    });

    // 3. Renderiza Linha do Tempo
    mainStages.forEach(stage => {
        let stageStatus = 'pending';
        const stepsInThisStage = stepsByStage[stage.id];
        const allCompleted = stepsInThisStage.length > 0 && stepsInThisStage.every(s => s.status === 'completed');
        const anyCompleted = stepsInThisStage.some(s => s.status === 'completed');
        
        if (allCompleted) stageStatus = 'completed';
        else if (anyCompleted || (firstPendingStep && firstPendingStep.estagio === stage.id)) stageStatus = 'active';

        const stageDiv = document.createElement('div');
        stageDiv.className = `wave-stage ${stage.id} ${stageStatus}`;

        const circle = document.createElement('div');
        circle.className = `wave-circle ${stageStatus}`;
        
        if (stageStatus === 'completed') {
            circle.innerHTML = '<span class="wave-circle-inner">✓</span>';
        } else {
            const completedCount = stepsInThisStage.filter(s => s.status === 'completed').length;
            circle.innerHTML = `<span class="wave-circle-inner" style="font-size: 0.8rem;">${completedCount}/${stepsInThisStage.length}</span>`;
        }

        const label = document.createElement('div');
        label.className = 'wave-label';
        label.innerText = stage.label;

        stageDiv.appendChild(circle);
        stageDiv.appendChild(label);
        waveContainer.appendChild(stageDiv);
    });

    // 4. Renderiza Grade de Detalhes
    mainStages.forEach(stage => {
        const columnDiv = document.createElement('div');
        columnDiv.className = `details-column ${stage.id}`;

        const header = document.createElement('h3');
        header.className = 'column-header';
        header.innerText = stage.label;

        const list = document.createElement('ul');
        list.className = 'column-items-list';

        stepsByStage[stage.id].forEach(step => {
            const itemLi = document.createElement('li');
            const isVisualActive = firstPendingStep && firstPendingStep.id === step.id;
            itemLi.className = `step-item ${step.status === 'completed' ? 'completed' : (isVisualActive ? 'active' : 'pending')}`;

            const textBlock = document.createElement('div');
            textBlock.className = 'step-text-block';

            const title = document.createElement('label');
            title.className = 'step-item-title';
            // Agora usa o visualNumber (calculado automaticamente)
            title.innerText = `${step.visualNumber}. ${step.titulo}`; 
            title.htmlFor = `chk-${step.id}`; 
            textBlock.appendChild(title);

            if (step.descricao) {
                const desc = document.createElement('div');
                desc.className = 'step-item-desc';
                desc.innerText = step.descricao;
                textBlock.appendChild(desc);
            }

            const actionsBlock = document.createElement('div');
            actionsBlock.className = 'step-actions-block';

            const btnEdit = document.createElement('button');
            btnEdit.className = 'icon-btn';
            btnEdit.innerHTML = '✏️';
            btnEdit.onclick = () => editStep(step.originalIndex);

            const btnDelete = document.createElement('button');
            btnDelete.className = 'icon-btn';
            btnDelete.innerHTML = '🗑️';
            btnDelete.onclick = () => deleteStep(step.originalIndex);

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'step-checkbox';
            checkbox.id = `chk-${step.id}`;
            checkbox.checked = step.status === 'completed';
            checkbox.addEventListener('change', (e) => toggleStep(step.originalIndex, e.target.checked));

            actionsBlock.appendChild(btnEdit);
            actionsBlock.appendChild(btnDelete);
            actionsBlock.appendChild(checkbox);

            itemLi.appendChild(textBlock);
            itemLi.appendChild(actionsBlock);
            list.appendChild(itemLi);
        });

        columnDiv.appendChild(header);
        columnDiv.appendChild(list);
        gridContainer.appendChild(columnDiv);
    });
}

document.getElementById('btn-add-step').addEventListener('click', addNewStep);
loadSteps();
