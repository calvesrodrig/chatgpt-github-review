import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { GridOptions } from 'ag-grid-community';
import { ModalController } from '@ionic/angular';
import "firebase/firestore";
import { addDays, parseISO, subDays } from 'date-fns';

import { AgGridServerSideComponent } from 'src/app/components/ag-grid-server-side/ag-grid-server-side.component';
import { ETaskDepartments, ITask } from 'src/app/models/task.model';
import { OptionWhere } from 'src/app/models/util.model';
import { TaskDetailsModalComponent } from 'src/app/pages/attendance/components/client-data/components/task-details-modal/task-details-modal.component';
import { TaskService } from 'src/app/services/task.service';
import { getTasksColumnDefs, getTasksRowClass } from 'src/app/shared/agGrid/tasks';
import { CreateToast } from 'src/app/utils/createToast.util';
import { convertDateToISOTimezone, timestampToSimpleDate } from 'src/app/utils/date.util';
import { ResponseFunctions } from 'src/app/utils/responseFunctions.util';


@Component({
  selector: 'app-clients-tasks',
  templateUrl: './clients-tasks.page.html',
  styleUrls: ['./clients-tasks.page.scss'],
})
export class ClientsTasksPage implements OnInit {
  @ViewChild('actionTemplate ', { static: true })
  actionTemplate: TemplateRef<any>;
  @ViewChild('dataTable') dataTable: AgGridServerSideComponent;
  gridData: any;
  public gridOptions: GridOptions;
  public rowsData: ITask[] = [];
  public columnDefs = [];
  public isLoading = false;
  public paginationPageSize = 50;
  public segment = 'open';
  public daysQuery = 0;
  
  public isEspecificPeriod = false;
  public today = convertDateToISOTimezone(new Date()).slice(0, 10);
  public dateInitial: string | undefined;
  public dateFinal: string | undefined;

  private responseFunctions = new ResponseFunctions();
  private createToast = new CreateToast();
  public fixedFilter: OptionWhere[] = [];
  public fixedFilterOpen: OptionWhere[] = [
    {
      key: 'departament_id',
      type: 'in',
      value: [
        ETaskDepartments.pos_venda,
        ETaskDepartments.atendimento,
      ],
    },
    {
      key: 'taskCompleted',
      type: '==',
      value: false,
    },
  ];
  
  public getRowClass = (params) => getTasksRowClass(params);
  
  constructor(private modalController: ModalController, private router: Router, private taskService: TaskService) {}

  ngOnInit() {
    this.isLoading = true;
    this.columnDefs = getTasksColumnDefs(this.actionTemplate);
    this.isLoading = false;
    this.fixedFilter = this.fixedFilterOpen;
  }

  public async treatTask(row:ITask) {
    this.taskService.getTaskById(row.id).subscribe(async (res) => {
      const response = this.responseFunctions.handleResponseError(res);
      const taskDoc = response.data;
      if ( !taskDoc ) {
        this.createToast.create({
          message: 'Tarefa inexistente!',
          color: 'warning',
        });
        return;
      }
      const modal = await this.modalController.create({
        component: TaskDetailsModalComponent,
        componentProps: {
          taskDetails: {
            ...taskDoc,
            solved_at: timestampToSimpleDate(taskDoc.solved_at),
          },
        },
        animated: true,
        swipeToClose: true,
      });
      await modal.present();

      const isTaskStatusChanged = await modal.onDidDismiss();
      if (isTaskStatusChanged.data) {
        this.dataTable.refresh();
      }
    }, 
    async (error) => {
      this.createToast.create({
        message: error,
        color: 'danger',
      });
      console.log(error);
    });
  }

  action(route: string, row: ITask) {
    this.router.navigateByUrl(`${route}/${row.user_id}`);
  }

  public changeGridSize(ev: any) {
    const { value } = ev.detail;

    this.dataTable.setPageSize(value);
    this.dataTable.refresh();
  }
  
  public async changePeriod(ev: any) {
    this.dateInitial = this.dateFinal = undefined;
    this.isEspecificPeriod = ev.detail.value === 'especifico';

    if (ev.detail.value == '30' || ev.detail.value == '60') {
      const daysQuery = ev.detail.value as number;
      
      this.changeFixedFilter(this.getFixedFilter(daysQuery));
    }
  }

  public changeDates() {
    if (!this.dateInitial) {
      this.createToast.create({
          message: 'Escolha a data inicial',
          color: 'warning',
      });
      return
    }
    if (!this.dateFinal) {
      this.createToast.create({
          message: 'Escolha a data final',
          color: 'warning',
      });
      return
    }   
    this.changeFixedFilter(this.getFixedFilter(undefined, parseISO(this.dateInitial), addDays(parseISO(this.dateFinal),1)));
  }

  public getFixedFilter(days?: number, dateInitial?: Date, dateEnd?: Date) {
    if (days) {
      const dateSelected = subDays(new Date(), days);
      return this.filterByDays(dateSelected);
    }
    return this.filterByPeriod(dateInitial, dateEnd);
  }

  public segmentChanged(ev: any) {
    this.isEspecificPeriod = false;
    this.dateInitial = this.dateFinal = undefined;
    
    this.segment = ev.detail.value;
    if (this.segment === 'closed') {
      this.changeFixedFilter(this.getFixedFilter(30));
    } else {
      this.changeFixedFilter(this.fixedFilterOpen);
    }

  }

  private changeFixedFilter(fixedFilter: OptionWhere[]) {
    this.fixedFilter = fixedFilter;
    this.dataTable.setFixedFilter(this.fixedFilter);
    this.dataTable.refresh();
  }

  private filterByDays(dateSelected: Date): OptionWhere[] {
    return [
      {
        key: 'departament_id',
        type: 'in',
        value: [
          ETaskDepartments.pos_venda,
          ETaskDepartments.atendimento,
        ],
      },
      {
        key: 'taskCompleted',
        type: '==',
        value: true,
      },
      {
        key: 'created_at',
        type: '>',
        value: dateSelected,
      },
    ];
  }


  private filterByPeriod(dateIni: Date, dateEnd: Date): OptionWhere[]  {
    return [
      {
        key: 'departament_id',
        type: 'in',
        value: [
          ETaskDepartments.pos_venda,
          ETaskDepartments.atendimento,
        ],
      },
      {
        key: 'taskCompleted',
        type: '==',
        value: true,
      },
      {
        key: 'created_at',
        type: '>',
        value: dateIni,
      },
      {
        key: 'created_at',
        type: '<',
        value: dateEnd,
      },
    ];
  }

}