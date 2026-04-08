// Substitua pelas suas chaves do Supabase
const supabaseUrl = 'https://jqpdampcglodtmfmeivk.supabase.co'; 
const supabaseAnonKey = 'sb_publishable_RnX8Pk3gAeJjM7vnnpWaGg_2zM0ZkyM';

const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);

let steps = [];

// Definição dos 5 grandes estágios (Inspirado no Artia)
const mainStages = [
    { id: 'start', label: 'INICIAÇÃO', visual: 'cyan' },
    { id: 'planning', label: 'PLANEJAMENTO', visual: 'purple' },
    { id: 'execution', label: 'EXECUÇÃO', visual: 'pink' },
    { id: 'monitoring', label: 'MONITORAMENTO', visual: 'darkblue' },
    { id: 'closing', label: 'ENCERRAMENTO', visual: 'orange' }
];

// Mapeamento de quais passos (numero_passo) pertencem a qual estágio
const stageMapping = {
    1: 'start', 2: 'start', 3: 'start', // Iniciação (Envio de pasta é o atual)
    4: 'planning', 5: 'planning', 6: 'planning', 7: 'planning', // Planejamento
    9: 'execution', 10: 'execution', 11: 'execution', // Execução
    19: 'monitoring', 20: 'monitoring', 21: 'monitoring', // Monitoramento
    22: 'closing', 23: 'closing' // Encerramento
};

// Carrega os dados do Supabase
async function loadSteps() {
    const { data, error } = await supabaseClient
        .from('status_financiamento')
        .select('*')
        .order('numero_passo', { ascending: true });

    if (error) {
        console.error("Erro ao carregar dados:", error);
        document.getElementById('details-grid-container').innerHTML = '<p style="text-align: center; color: red;">Erro ao carregar os dados. Verifique a conexão com o banco.</p>';
        return;
    }

    steps = data || [];
    renderSteps();
}

// Atualiza o status (completed / pending) no banco
async function toggleStep(index, isChecked) {
    const step = steps[index];
    const novoStatus = isChecked ? 'completed' : 'pending';
    
    // Atualiza localmente primeiro
    step.status = novoStatus;
    renderSteps();

    // Salva no banco
    const { error } = await supabaseClient
        .from('status_financiamento')
        .update({ status: novoStatus })
        .eq('id', step.id);

    if (error) console.error("Erro ao atualizar status:", error);
}

// Edita título e descrição
async function editStep(index) {
    const step = steps[index];
    const newTitle = prompt("Edite o nome da etapa:", step.titulo);
    if (newTitle === null) return;
    
    const newDesc = prompt("Edite a descrição (deixe em branco para remover):", step.descricao || "");
    if (newDesc === null) return;

    const tituloAtualizado = newTitle.trim() || step.titulo;
    const descAtualizada = newDesc.trim() || null;

    step.titulo = tituloAtualizado;
    step.descricao = descAtualizada;
    renderSteps();

    const { error } = await supabaseClient
        .from('status_financiamento')
        .update({ titulo: tituloAtualizado, descricao: descAtualizada })
        .eq('id', step.id);

    if (error) console.error("Erro ao editar etapa:", error);
}

// Exclui uma etapa do banco
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

// Adiciona nova etapa
async function addNewStep() {
    const numInput = document.getElementById('new-num');
    const titleInput = document.getElementById('new-title');
    const descInput = document.getElementById('new-desc');

    if (!numInput.value || !titleInput.value) {
        alert("Por favor, preencha o Número e o Nome da etapa.");
        return;
    }

    const novoPassoNum = parseInt(numInput.value);

    // Mapeamento padrão se o passo não tiver um mapeamento definido
    let assignedStage = 'start'; // Padrão
    for (const [keyNum, stageId] of Object.entries(stageMapping)) {
        if (novoPassoNum <= parseInt(keyNum)) {
            assignedStage = stageId;
            break;
        }
        assignedStage = 'closing'; // Se for maior que todos, vai pro encerramento
    }

    const novoPasso = {
        numero_passo: novoPassoNum,
        titulo: titleInput.value,
        descricao: descInput.value || null,
        status: 'pending'
    };

    numInput.value = '';
    titleInput.value = '';
    descInput.value = '';

    const { error } = await supabaseClient
        .from('status_financiamento')
        .insert([novoPasso]);

    if (error) {
        console.error("Erro ao adicionar etapa:", error);
        return;
    }

    // Recarrega tudo para pegar o ID do banco e manter a ordem
    loadSteps();
}

// Renderiza o HTML na tela
function renderSteps() {
    // 1. Limpa os contêineres principais
    const waveContainer = document.getElementById('timeline-wave-container');
    const gridContainer = document.getElementById('details-grid-container');
    waveContainer.innerHTML = ''; 
    gridContainer.innerHTML = '';

    // 2. Cria objetos para agrupar passos concluídos e pendentes por estágio
    const stepsByStage = {
        start: [],
        planning: [],
        execution: [],
        monitoring: [],
        closing: []
    };

    let firstPendingStep = null;
    let foundFirstPending = false;

    // 3. Prepara os passos para renderização
    steps.forEach((step, index) => {
        // Vincula a referência local para interatividade
        step.originalIndex = index; 

        // Atribui ao estágio correto com base no número
        const stageId = stageMapping[step.numero_passo] || 'start'; // Padrão
        if (stepsByStage[stageId]) {
            stepsByStage[stageId].push(step);
        }

        // Identifica o primeiro passo pendente
        if (step.status !== 'completed' && !foundFirstPending) {
            firstPendingStep = step;
            foundFirstPending = true;
        }
    });

    // 4. Renderiza a Linha do Tempo Ondulada (Wave Timeline)
    mainStages.forEach(stage => {
        // Determina o status do estágio
        let stageStatus = 'pending';
        const stepsInThisStage = stepsByStage[stage.id];
        const allCompleted = stepsInThisStage.length > 0 && stepsInThisStage.every(s => s.status === 'completed');
        const anyCompleted = stepsInThisStage.some(s => s.status === 'completed');
        
        if (allCompleted) {
            stageStatus = 'completed';
        } else if (anyCompleted || (firstPendingStep && stageMapping[firstPendingStep.numero_passo] === stage.id)) {
            // Se o primeiro passo pendente estiver neste estágio, ou se qualquer passo estiver completo
            stageStatus = 'active';
        }

        const stageDiv = document.createElement('div');
        stageDiv.className = `wave-stage ${stage.id} ${stageStatus}`;

        const circle = document.createElement('div');
        circle.className = `wave-circle ${stageStatus}`;
        
        // Determina o conteúdo do círculo (ícone ou número de passo concluído)
        let circleContent = '';
        if (stageStatus === 'completed') {
            circleContent = '<span class="wave-circle-inner">✓</span>';
        } else {
            // Mostra o número de passos concluídos neste estágio (ex: "3/3")
            const completedCount = stepsInThisStage.filter(s => s.status === 'completed').length;
            const totalCount = stepsInThisStage.length;
            circleContent = `<span class="wave-circle-inner" style="font-size: 0.8rem;">${completedCount}/${totalCount}</span>`;
        }
        circle.innerHTML = circleContent;

        const label = document.createElement('div');
        label.className = 'wave-label';
        label.innerText = stage.label;

        stageDiv.appendChild(circle);
        stageDiv.appendChild(label);
        waveContainer.appendChild(stageDiv);
    });

    // 5. Renderiza a Grade Detalhada (Details Grid)
    mainStages.forEach(stage => {
        const columnDiv = document.createElement('div');
        columnDiv.className = `details-column ${stage.id}`;

        const header = document.createElement('h3');
        header.className = 'column-header';
        header.innerText = stage.label;

        const list = document.createElement('ul');
        list.className = 'column-items-list';

        // Injeta os itens da lista de verificação
        stepsByStage[stage.id].forEach(step => {
            const itemLi = document.createElement('li');
            
            // Determina se é o passo ativo atual
            const isVisualActive = firstPendingStep && firstPendingStep.id === step.id;
            const itemVisualStatus = step.status === 'completed' ? 'completed' : (isVisualActive ? 'active' : 'pending');
            itemLi.className = `step-item ${itemVisualStatus}`;

            const textBlock = document.createElement('div');
            textBlock.className = 'step-text-block';

            const title = document.createElement('label');
            title.className = 'step-item-title';
            title.innerText = `${step.numero_passo}. ${step.titulo}`;
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

// Adiciona o evento de clique no botão de adição
document.getElementById('btn-add-step').addEventListener('click', addNewStep);

// Inicia o carregamento quando a página abre
loadSteps();
