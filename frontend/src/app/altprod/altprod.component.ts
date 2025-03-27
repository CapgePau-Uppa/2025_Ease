/**
 * @file altprod.component.ts
 * @brief Defines the AltProd component and its dependencies.
 */

import { Component } from '@angular/core';
import { ProdalternativeComponent } from './comp/prodalternative/prodalternative.component';
import { ProdsearchComponent } from './comp/prodsearch/prodsearch.component';
import { NavbarComponent } from '../shared/components/navbar/navbar.component';

/**
 * @class AltprodComponent
 * @brief Represents the AltProd component responsible for product search and alternative suggestions.
 */
@Component({
  selector: 'app-altprod', ///< The HTML tag used to include this component.
  imports: [NavbarComponent, ProdalternativeComponent, ProdsearchComponent], ///< Imported components used within AltProd.
  templateUrl: './altprod.component.html', ///< Template file defining the component's structure.
  styleUrl: './altprod.component.css' ///< Stylesheet applied to this component.
})
export class AltprodComponent {
  /**
   * @brief Default constructor for the AltprodComponent class.
   */
  constructor() { }
}
